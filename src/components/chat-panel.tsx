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
import { ScrollArea } from '@/components/ui/scroll-area';
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
}

// Demo login credentials for reference
const DEMO_ACCOUNTS = [
  { email: 'buyer@grosirpj.id', password: 'password123', label: 'Pembeli (Budi)', icon: '🛒' },
  { email: 'seller1@grosirpj.id', password: 'password123', label: 'Seller (CV Garment)', icon: '🏪' },
];

export function ChatPanel() {
  const chatOpen = useUIStore((s) => s.chatOpen);
  const chatWithUserId = useUIStore((s) => s.chatWithUserId);
  const closeChat = useUIStore((s) => s.closeChat);

  const user = useAuthStore((s) => s.user);
  const sellerMode = useAuthStore((s) => s.sellerMode);
  const setLoginModalOpen = useAuthStore((s) => s.setLoginModalOpen);

  const isSeller = user?.role === 'seller' || sellerMode;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activePartner, setActivePartner] = useState<string | null>(chatWithUserId);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/chat?userId=${user.id}`);
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  }, [user]);

  // Fetch messages with a specific partner
  const fetchMessages = useCallback(async (partnerId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/chat?userId=${user.id}&otherUserId=${partnerId}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, [user]);

  // Send message
  const handleSendMessage = async () => {
    if (!user || !activePartner || !messageInput.trim()) return;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: activePartner,
          message: messageInput.trim(),
        }),
      });

      if (res.ok) {
        setMessageInput('');
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
        fetchMessages(activePartner);
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Handle textarea key down - WhatsApp style
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // Shift+Enter naturally creates a new line in textarea - no special handling needed
  };

  // Auto-resize textarea (WhatsApp style: grows up to 5 lines, then scrolls)
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);
    const textarea = e.target;

    // Reset height to recalculate
    textarea.style.height = 'auto';

    // Calculate line height (approx 24px per line with text-sm)
    const lineHeight = 24;
    const maxHeight = lineHeight * 5; // 5 lines max visible

    // Set height to content height, capped at maxHeight
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;

    // If content exceeds max height, enable scrolling
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  // Initial load and auto-select partner
  useEffect(() => {
    if (!chatOpen || !user) return;
    const loadData = async () => {
      await fetchConversations();
      if (chatWithUserId) {
        setActivePartner(chatWithUserId);
        await fetchMessages(chatWithUserId);
      }
    };
    loadData();
  }, [chatOpen, user, chatWithUserId, fetchConversations, fetchMessages]);

  // Polling for new messages
  useEffect(() => {
    if (chatOpen && user && activePartner) {
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(activePartner);
        fetchConversations();
      }, 3000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [chatOpen, user, activePartner, fetchMessages, fetchConversations]);

    // No auto-scroll — let user manually scroll to read messages

  const handleSelectPartner = (partnerId: string) => {
    setActivePartner(partnerId);
    fetchMessages(partnerId);
  };

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

            {/* Demo credentials */}
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
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 bg-white">
                  {messages.map((msg) => {
                    const isMine = msg.senderId === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                          isMine
                            ? 'bg-emerald-100 text-gray-800 rounded-br-md'
                            : 'bg-gray-100 text-gray-800 rounded-bl-md'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                          <div className={`flex items-center justify-end gap-1 mt-0.5`}>
                            <span className={`text-[10px] ${isMine ? 'text-emerald-600/60' : 'text-gray-400'}`}>
                              {formatTime(msg.createdAt)}
                            </span>
                            {isMine && (
                              <span className={`text-[10px] ${msg.read ? 'text-blue-500' : 'text-gray-400'}`}>
                                ✓✓
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input - WhatsApp Style */}
                <div className="border-t p-2 flex items-end gap-2 bg-gray-50 shrink-0">
                  {/* Emoji button placeholder */}
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0 mb-0.5">
                    <Smile className="w-5 h-5" />
                  </button>

                  {/* Auto-resizing Textarea */}
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
                        maxHeight: '120px', // ~5 lines
                        minHeight: '40px',
                        lineHeight: '24px',
                      }}
                    />
                  </div>

                  {/* Attachment button */}
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0 mb-0.5">
                    <Paperclip className="w-5 h-5" />
                  </button>

                  {/* Send button */}
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
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
                    
                    {/* Show demo account info */}
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
                              {/* Show "You: " prefix for own messages */}
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
