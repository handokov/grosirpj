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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUIStore } from '@/store/ui';
import { useAuthStore } from '@/store/auth';
import { MessageCircle, Send, ArrowLeft, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

export function ChatPanel() {
  const chatOpen = useUIStore((s) => s.chatOpen);
  const chatWithUserId = useUIStore((s) => s.chatWithUserId);
  const closeChat = useUIStore((s) => s.closeChat);

  const user = useAuthStore((s) => s.user);
  const setLoginModalOpen = useAuthStore((s) => s.setLoginModalOpen);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activePartner, setActivePartner] = useState<string | null>(chatWithUserId);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
        fetchMessages(activePartner);
        fetchConversations();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
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

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        <SheetHeader className="p-4 border-b border-gray-100">
          <SheetTitle className="text-lg font-display flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-500" /> Chat
            {totalUnread > 0 && (
              <Badge className="bg-red-500 text-white text-xs">{totalUnread}</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {activePartner ? 'Percakapan dengan seller' : 'Pilih percakapan'}
          </SheetDescription>
        </SheetHeader>

        {!user ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">Login untuk menggunakan fitur chat</p>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl" onClick={() => setLoginModalOpen(true)}>
              Login Sekarang
            </Button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            {activePartner ? (
              /* Message Thread View */
              <>
                {/* Partner Header */}
                <div className="flex items-center gap-3 p-3 border-b border-gray-100 bg-gray-50">
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
                       conversations.find(c => c.partner.id === activePartner)?.partner?.name || 'Seller'}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => {
                    const isMine = msg.senderId === user.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                          isMine
                            ? 'bg-emerald-500 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-800 rounded-bl-md'
                        }`}>
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? 'text-emerald-200' : 'text-gray-400'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="border-t p-3 flex gap-2">
                  <Input
                    placeholder="Ketik pesan..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    className="rounded-xl flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl px-4"
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
                    <p className="text-sm text-gray-400">Chat seller dari halaman produk untuk mulai percakapan</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {conversations.map((conv) => (
                      <button
                        key={conv.partner.id}
                        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
                        onClick={() => handleSelectPartner(conv.partner.id)}
                      >
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-bold">
                            {conv.partner.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {conv.partner.storeName || conv.partner.name}
                            </p>
                            <span className="text-xs text-gray-400 shrink-0">{formatTime(conv.lastMessage.createdAt)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-0.5">
                            <p className="text-xs text-gray-500 truncate">{conv.lastMessage.message}</p>
                            {conv.unreadCount > 0 && (
                              <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 shrink-0">{conv.unreadCount}</Badge>
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
