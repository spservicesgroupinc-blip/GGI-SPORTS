import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, ArrowLeft } from 'lucide-react';
import { fetchFromGas, gasAuth } from '../services/gasService';

interface Message {
  id: string;
  userId: string;
  fullName: string;
  text: string;
  timestamp: string;
}

interface ChatProps {
  onBack?: () => void;
  messages: Message[];
  isLoading: boolean;
  onRefresh: () => void;
  key?: string | null;
}

export default function Chat({ onBack, messages, isLoading, onRefresh }: ChatProps) {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentUserId = gasAuth.getUserId();

  // Filter out optimistic messages that are now in the real messages list
  const activeMessages = [...messages, ...optimisticMessages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  // Deduplicate by ID
  const uniqueMessages = Array.from(new Map(activeMessages.map(m => [m.id, m])).values());

  useEffect(() => {
    if (messages.length > 0) {
      setOptimisticMessages(prev => prev.filter(optMsg => !messages.some(m => m.id === optMsg.id || (m.text === optMsg.text && m.userId === optMsg.userId && new Date(m.timestamp).getTime() - new Date(optMsg.timestamp).getTime() < 5000))));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [uniqueMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText;
    setInputText('');
    setIsSending(true);

    const tempId = 'temp-' + Date.now();
    const fullName = gasAuth.getFullName();
    const tempMsg: Message = {
      id: tempId,
      userId: currentUserId,
      fullName,
      text: textToSend,
      timestamp: new Date().toISOString()
    };

    setOptimisticMessages(prev => [...prev, tempMsg]);

    try {
      await fetchFromGas('sendMessage', { text: textToSend, fullName });
      onRefresh();
    } catch (err) {
      console.error('Failed to send message:', err);
      // Put message back if failed
      setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
      setInputText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <header className="pt-safe pb-4 border-b border-slate-800 flex items-center px-4 md:px-6 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10 shrink-0 gap-4">
        {onBack && (
          <button 
            onClick={onBack} 
            className="p-3 -ml-2 text-slate-400 hover:text-white transition-colors bg-slate-900/80 hover:bg-slate-800 rounded-full md:hidden flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <h2 className="text-lg font-semibold text-white flex-1">GGI Youth Sports Chat</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : uniqueMessages.length === 0 ? (
          <div className="text-center text-slate-500 mt-10">
            No messages yet. Start the conversation!
          </div>
        ) : (
          uniqueMessages.map((msg) => {
            const isMe = msg.userId === currentUserId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-slate-500 mb-1 px-1">
                  {msg.fullName} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div 
                  className={`px-4 py-2.5 rounded-2xl max-w-[85%] sm:max-w-[75%] ${
                    isMe 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-full px-5 py-3 text-white text-sm outline-none transition-all"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white p-3 rounded-full transition-colors flex items-center justify-center shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
