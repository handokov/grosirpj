'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { MessageCircle, Send, ArrowLeft, Smile, Paperclip } from 'lucide-react';

interface Conversation {
  partner: { id: string; name: string; storeName?: string };
  lastMessage: { id: string; message: string; senderId: string; createdAt: string; read: boolean };
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  message: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  read: boolean;
  sender: { id: string; name: string };
  receiver: { id: string; name: string };
  isOptimistic?: boolean;
}

// Demo login credentials for reference
const DEMO_ACCOUNTS = [
  { email: 'buyer@grosirpj.id', password: 'password123', label: 'Pembeli (Budi)', icon: '🛒' },
  { email: 'seller1@grosirpj.id', password: 'password123', label: 'Seller (CV Garment)', icon: '🏪' },
];

// LocalStorage cache keys for instant chat rendering
const LS_CONV_KEY = 'grosirpj_chat_conv';
const LS_CONV_TS_KEY = 'grosirpj_chat_conv_ts';

function loadCachedConversations(userId: string): Conversation[] | null {
  try {
    const ts = localStorage.getItem(`${LS_CONV_TS_KEY}_${userId}`);
    const data = localStorage.getItem(`${LS_CONV_KEY}_${userId}`);
    if (!ts || !data) return null;
    const timestamp = parseInt(ts, 10);
    // Use cache if less than 2 minutes old
    if (Date.now() - timestamp < 120_000) {
      const convs = JSON.parse(data);
      if (Array.isArray(convs)) return convs;
    }
    return null;
  } catch {
    return null;
  }
}

function saveConversationsToCache(userId: string, convs: Conversation[]) {
  try {
    localStorage.setItem(`${LS_CONV_KEY}_${userId}`, JSON.stringify(convs));
    localStorage.setItem(`${LS_CONV_TS_KEY}_${userId}`, Date.now().toString());
  } catch {
    // localStorage full or unavailable
  }
}

export function ChatPanel() {
  const chatOpen = useUIStore((s) => s.chatOpen);
  const chatWithUserId = useUIStore((s) => s.chatWithUserId);
  const closeChat = useUIStore((s) => s.closeChat);
  const setUnreadChatCount = useUIStore((s) => s.setUnreadChatCount);

  const user = useAuthStore((s) => s.user);
  const sellerMode = useAuthStore((s) => s.sellerMode);
  const setLoginModalOpen = useAuthStore((s) => s.setLoginModalOpen);

  const isSeller = user?.role === 'seller' || sellerMode;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activePartner, setActivePartner] = useState<string | null>(chatWithUserId);
  const [messageInput, setMessageInput] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottomRef = useRef(true);
  const activePartnerRef = useRef<string | null>(null);
  const sendingRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestFetchIdRef = useRef(0);
  const initDoneRef = useRef(false); // Track if init has completed

  // Keep ref in sync with state
  useEffect(() => {
    activePartnerRef.current = activePartner;
  }, [activePartner]);

  // Mark messages as read for a specific partner
  const markAsRead = useCallback(async (partnerId: string) => {
    if (!user) return;
    try {
      await fetch('/api/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, partnerId }),
      });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, [user]);

  // Fetch conversations (lightweight, for polling updates)
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/chat?userId=${user.id}`);
      const data = await res.json();
      if (res.ok) {
        const convs = data.conversations || [];
        setConversations(convs);
        const total = convs.reduce((sum: number, c: Conversation) => sum + c.unreadCount, 0);
        setUnreadChatCount(total);
        saveConversationsToCache(user.id, convs);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  }, [user, setUnreadChatCount]);

  // Fetch messages with a specific partner (for polling updates)
  const fetchMessages = useCallback(async (partnerId: string) => {
    if (!user) return;
    const fetchId = ++latestFetchIdRef.current;
    try {
      const res = await fetch(`/api/chat?userId=${user.id}&otherUserId=${partnerId}`);
      const data = await res.json();
      if (res.ok) {
        const serverMessages: ChatMessage[] = data.messages || [];
        if (fetchId === latestFetchIdRef.current && activePartnerRef.current === partnerId) {
          setMessages((prev) => {
            const optimisticMsgs = prev.filter((m) => m.isOptimistic);
            if (optimisticMsgs.length === 0) return serverMessages;
            const stillPending = optimisticMsgs.filter((opt) => {
              return !serverMessages.some(
                (srv) => srv.senderId === opt.senderId && srv.message === opt.message
              );
            });
            if (stillPending.length === 0) return serverMessages;
            return [...serverMessages, ...stillPending];
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [user]);

  // Send message with optimistic update
  const handleSendMessage = useCallback(async () => {
    if (!user || !activePartnerRef.current || !messageInput.trim() || sendingRef.current) return;

    const currentPartner = activePartnerRef.current;
    const text = messageInput.trim();
    sendingRef.current = true;

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      message: text,
      senderId: user.id,
      receiverId: currentPartner,
      createdAt: new Date().toISOString(),
      read: false,
      sender: { id: user.id, name: user.name },
      receiver: { id: currentPartner, name: '' },
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageInput('');
    shouldScrollToBottomRef.current = true;

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: currentPartner,
          message: text,
        }),
      });

      if (res.ok) {
        await Promise.all([
          fetchMessages(currentPartner),
          fetchConversations(),
        ]);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setMessageInput(text);
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setMessageInput(text);
      console.error('Failed to send message:', err);
    } finally {
      sendingRef.current = false;
    }
  }, [user, messageInput, fetchMessages, fetchConversations]);

  // Handle textarea key down
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    const lineHeight = 24;
    const maxHeight = lineHeight * 5;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  // ===== OPTIMIZED INITIAL LOAD =====
  // Uses /api/chat/init (1 request instead of 4) + localStorage cache for instant rendering
  useEffect(() => {
    if (!chatOpen || !user) return;

    const initChat = async () => {
      // 1. Try to show cached conversations IMMEDIATELY
      if (user) {
        const cached = loadCachedConversations(user.id);
        if (cached && cached.length > 0) {
          setConversations(cached);
          const total = cached.reduce((sum, c) => sum + c.unreadCount, 0);
          setUnreadChatCount(total);
        }
      }

      // 2. If opening with a specific partner, show loading for messages
      if (chatWithUserId) {
        setMessages([]);
        setActivePartner(chatWithUserId);
        shouldScrollToBottomRef.current = true;
        setMessagesLoading(true);
      }

      // 3. Single combined API call for everything
      try {
        const res = await fetch('/api/chat/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partnerId: chatWithUserId || null,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const convs = data.conversations || [];
          const msgs = data.messages || [];

          setConversations(convs);
          setUnreadChatCount(data.totalUnread || 0);
          saveConversationsToCache(user.id, convs);

          // Only set messages if we requested for a specific partner
          if (chatWithUserId && activePartnerRef.current === chatWithUserId) {
            // Only overwrite if no optimistic messages pending
            setMessages((prev) => {
              const optimisticMsgs = prev.filter((m) => m.isOptimistic);
              if (optimisticMsgs.length === 0) return msgs;
              return [...msgs, ...optimisticMsgs];
            });
          }
        }
      } catch (err) {
        console.error('Chat init failed:', err);
      } finally {
        setMessagesLoading(false);
        initDoneRef.current = true;

        // Ensure scroll to bottom after everything is loaded
        if (chatWithUserId) {
          shouldScrollToBottomRef.current = true;
          scrollToBottom();
          scrollToBottom(400);
          scrollToBottom(800);
        }
      }
    };

    initChat();
  }, [chatOpen, user, chatWithUserId]); // Remove fetch functions from deps to avoid re-triggering

  // Polling for active conversation (5s interval)
  useEffect(() => {
    if (chatOpen && user && activePartner && initDoneRef.current) {
      const doPoll = async () => {
        if (document.visibilityState !== 'visible') return;
        const currentPartner = activePartnerRef.current;
        if (!currentPartner) return;

        await Promise.all([
          fetchMessages(currentPartner),
          markAsRead(currentPartner),
          fetchConversations(),
        ]);
      };

      // First poll after 5s (NOT immediately — init already loaded data)
      pollIntervalRef.current = setInterval(doPoll, 5000);
    }
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [chatOpen, user, activePartner]);

  // Background polling for unread count when chat is closed (30s)
  useEffect(() => {
    if (!chatOpen && user) {
      const doPoll = () => {
        if (document.visibilityState !== 'visible') return;
        fetchConversations();
      };
      const interval = setInterval(doPoll, 30000);
      return () => clearInterval(interval);
    }
  }, [chatOpen, user]);

  // Robust scroll-to-bottom helper
  const scrollToBottom = useCallback((delay = 0) => {
    const doScroll = () => {
      const container = messagesContainerRef.current;
      const endRef = messagesEndRef.current;
      if (endRef) {
        endRef.scrollIntoView({ behavior: 'instant' });
      }
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    };
    if (delay > 0) {
      const id = setTimeout(doScroll, delay);
      return () => clearTimeout(id);
    } else {
      doScroll();
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length === 0) return;

    if (shouldScrollToBottomRef.current) {
      const raf = requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      });
      const timeout1 = setTimeout(() => {
        if (shouldScrollToBottomRef.current) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
          const container = messagesContainerRef.current;
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }
      }, 600);
      const timeout2 = setTimeout(() => {
        if (shouldScrollToBottomRef.current) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
          const container = messagesContainerRef.current;
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        }
      }, 900);
      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timeout1);
        clearTimeout(timeout2);
      };
    }
  }, [messages]);

  // Track scroll position
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    shouldScrollToBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;
  }, []);

  // Select a partner — use lightweight fetch (not full init)
  const handleSelectPartner = async (partnerId: string) => {
    setMessages([]);
    setActivePartner(partnerId);
    shouldScrollToBottomRef.current = true;
    setMessagesLoading(true);

    await Promise.all([
      fetchMessages(partnerId),
      markAsRead(partnerId),
    ]);

    setMessagesLoading(false);
    fetchConversations();

    shouldScrollToBottomRef.current = true;
    scrollToBottom();
  };

  // Reset state when chat panel closes
  useEffect(() => {
    if (!chatOpen) {
      setMessages([]);
      setActivePartner(null);
      setMessageInput('');
      setMessagesLoading(false);
      sendingRef.current = false;
      latestFetchIdRef.current = 0;
      initDoneRef.current = false;
      shouldScrollToBottomRef.current = true;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [chatOpen]);

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <Sheet open={chatOpen} onOpenChange={(open) => { if (!open) closeChat(); }}>
      <SheetContent side="right" className="w-full sm:w-96 md:max-w-lg p-0 flex flex-col gap-0 overflow-hidden">
        <SheetHeader className="p-4 border-b border-gray-100 shrink-0">
          <SheetTitle className="text-lg font-display flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-500" /> {isSeller ? 'Chat Pembeli' : 'Chat'}
            {totalUnread > 0 && (
              <Badge className="bg-red-500 text-white text-xs">{totalUnread}</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {activePartner ? (isSeller ? 'Percakapan dengan pembeli' : 'Percakapan dengan seller') : 'Pilih percakapan'}
          </SheetDescription>
        </SheetHeader>

        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-2">Login untuk menggunakan fitur chat</p>
            <p className="text-xs text-gray-400 mb-4">Gunakan akun demo untuk melihat contoh chat</p>

            <div className="w-full max-w-xs space-y-2 mb-4">
              {DEMO_ACCOUNTS.map((account) => (
                <div
                  key={account.email}
                  className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl text-left border border-gray-100"
                >
                  <span className="text-lg">{account.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700">{account.label}</p>
                    <p className="text-[10px] text-gray-400 truncate">{account.email}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl w-full max-w-xs" onClick={() => setLoginModalOpen(true)}>
              Login Sekarang
            </Button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            {activePartner ? (
              /* Message Thread View */
              <>
                {/* Partner Header */}
                <div className="flex items-center gap-3 p-3 border-b border-gray-100 bg-gray-50 shrink-0">
                  <button onClick={() => setActivePartner(null)} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
                    <ArrowLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                      {conversations.find(c => c.partner.id === activePartner)?.partner?.name?.charAt(0)?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {conversations.find(c => c.partner.id === activePartner)?.partner?.storeName ||
                       conversations.find(c => c.partner.id === activePartner)?.partner?.name || (isSeller ? 'Pembeli' : 'Seller')}
                    </p>
                    <p className="text-[10px] text-emerald-500">Online</p>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-white"
                >
                  {/* Loading state */}
                  {messagesLoading && messages.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-sm text-gray-400">Mulai percakapan...</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderId === user.id;
                      return (
                        <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                            isMine
                              ? 'bg-emerald-100 text-gray-800 rounded-br-md'
                              : 'bg-gray-100 text-gray-800 rounded-bl-md'
                          } ${msg.isOptimistic ? 'opacity-70' : ''}`}>
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                            <div className={`flex items-center justify-end gap-1 mt-0.5`}>
                              <span className={`text-[10px] ${isMine ? 'text-emerald-600/60' : 'text-gray-400'}`}>
                                {formatTime(msg.createdAt)}
                              </span>
                              {isMine && (
                                <span className={`text-[10px] ${msg.isOptimistic ? 'text-gray-400' : msg.read ? 'text-blue-500' : 'text-gray-400'}`}>
                                  {msg.isOptimistic ? '⏳' : '✓✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t p-2 flex items-end gap-2 bg-gray-50 shrink-0">
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0 mb-0.5">
                    <Smile className="w-5 h-5" />
                  </button>

                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      placeholder="Ketik pesan..."
                      value={messageInput}
                      onChange={handleTextareaChange}
                      onKeyDown={handleTextareaKeyDown}
                      rows={1}
                      className="w-full resize-none rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 placeholder:text-gray-400 overflow-y-auto"
                      style={{
                        height: 'auto',
                        maxHeight: '120px',
                        minHeight: '40px',
                        lineHeight: '24px',
                      }}
                    />
                  </div>

                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0 mb-0.5">
                    <Paperclip className="w-5 h-5" />
                  </button>

                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || sendingRef.current}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full w-10 h-10 p-0 shrink-0 disabled:opacity-40 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              /* Conversation List */
              <div className="flex-1 min-h-0 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <MessageCircle className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="font-semibold text-gray-800 mb-1">Belum Ada Chat</h3>
                    <p className="text-sm text-gray-400 mb-4">{isSeller ? 'Chat dari pembeli akan muncul di sini' : 'Chat seller dari halaman produk untuk mulai percakapan'}</p>

                    <div className="w-full max-w-xs space-y-2 mt-2">
                      <p className="text-xs text-gray-400">Login dengan akun demo untuk melihat contoh chat:</p>
                      {DEMO_ACCOUNTS.map((account) => (
                        <div
                          key={account.email}
                          className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl text-left border border-gray-100"
                        >
                          <span className="text-lg">{account.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700">{account.label}</p>
                            <p className="text-[10px] text-gray-400 truncate">{account.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {conversations.map((conv) => (
                      <button
                        key={conv.partner.id}
                        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                        onClick={() => handleSelectPartner(conv.partner.id)}
                      >
                        <Avatar className="w-12 h-12 shrink-0">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold">
                            {conv.partner.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {conv.partner.storeName || conv.partner.name}
                            </p>
                            <span className={`text-xs shrink-0 ${conv.unreadCount > 0 ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                              {formatTime(conv.lastMessage.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                              {conv.lastMessage.senderId === user?.id && (
                                <span className="text-gray-400">Anda: </span>
                              )}
                              {conv.lastMessage.message}
                            </p>
                            {conv.unreadCount > 0 && (
                              <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 shrink-0 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                                {conv.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
