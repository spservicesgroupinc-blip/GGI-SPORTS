import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Users, Circle, Clock } from 'lucide-react';
import { gasAuth, fetchFromGas } from '../services/gasService';

export interface Member {
  id: string;
  fullName: string;
  lastSeen?: string;
  towns?: string[];
  role?: string;
}

export interface DM {
  id: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  timestamp: string;
}

interface DirectMessagesProps {
  onBack?: () => void;
  directMessages: DM[];
  members: Member[];
  markDMsAsSeen: (userId: string) => void;
  seenMessageIds: string[];
}

export default function DirectMessages({ onBack, directMessages, members, markDMsAsSeen, seenMessageIds }: DirectMessagesProps) {
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [optimisticDMs, setOptimisticDMs] = useState<DM[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentUserId = gasAuth.getUserId();

  const filteredMembers = members.filter(m => m.id !== currentUserId);

  const sortedMembers = [...filteredMembers].sort((a, b) => {
      const aMessages = directMessages.filter(m => (m.fromUserId === a.id || m.toUserId === a.id));
      const bMessages = directMessages.filter(m => (m.fromUserId === b.id || m.toUserId === b.id));
      const aLatest = aMessages.length > 0 ? new Date(aMessages[aMessages.length - 1].timestamp).getTime() : 0;
      const bLatest = bMessages.length > 0 ? new Date(bMessages[bMessages.length - 1].timestamp).getTime() : 0;
      return bLatest - aLatest;
  });

  const activeMessages = selectedUser 
    ? [...directMessages, ...optimisticDMs].filter(m => 
        (m.fromUserId === currentUserId && m.toUserId === selectedUser.id) ||
        (m.fromUserId === selectedUser.id && m.toUserId === currentUserId)
      ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [];

  // Deduplicate by ID
  const uniqueMessages = Array.from(new Map(activeMessages.map(m => [m.id, m])).values());

  useEffect(() => {
    if (selectedUser) {
      markDMsAsSeen(selectedUser.id);
    }
  }, [selectedUser, directMessages, markDMsAsSeen]);

  useEffect(() => {
    // Clear optimistic DMs once they appear in the real list
    if (directMessages.length > 0) {
      setOptimisticDMs(prev => prev.filter(optMsg => !directMessages.some(m => m.id === optMsg.id || m.text === optMsg.text && m.fromUserId === optMsg.fromUserId && new Date(m.timestamp).getTime() - new Date(optMsg.timestamp).getTime() < 5000)));
    }
  }, [directMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [uniqueMessages, selectedUser]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || !selectedUser) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    const tempId = 'temp-' + Date.now();
    const tempMsg: DM = {
      id: tempId,
      fromUserId: currentUserId,
      toUserId: selectedUser.id,
      text: textToSend,
      timestamp: new Date().toISOString()
    };
    
    setOptimisticDMs(prev => [...prev, tempMsg]);

    try {
      await fetchFromGas('sendDirectMessage', { targetUserId: selectedUser.id, text: textToSend });
    } catch (err) {
      console.error('Failed to send DM:', err);
      // Remove optimistic update
      setOptimisticDMs(prev => prev.filter(m => m.id !== tempId));
      setInputText(textToSend); // Put back on failure
    } finally {
      setIsSending(false);
    }
  };

  const isOnline = (lastSeen?: string) => {
    if (!lastSeen) return false;
    const diff = new Date().getTime() - new Date(lastSeen).getTime();
    return diff < 10 * 60 * 1000; // 10 minutes
  };

  if (selectedUser) {
    return (
      <div className="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden relative">
        <header className="pt-safe pb-4 border-b border-neutral-800 flex items-center gap-3 px-4 md:px-8 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <button onClick={() => setSelectedUser(null)} className="p-2 -ml-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors md:hidden">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold text-white truncate flex items-center gap-2">
              {selectedUser.fullName}
              {isOnline(selectedUser.lastSeen) ? (
                <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />
              ) : (
                <Circle className="w-2.5 h-2.5 fill-neutral-600 text-neutral-600" />
              )}
            </h1>
            <p className="text-xs text-neutral-400 font-medium">Direct Message</p>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:px-8 space-y-4">
          {uniqueMessages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 mt-8 opacity-50 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl mx-auto max-w-sm text-center">
              <Users className="w-8 h-8 text-neutral-500" />
              <p className="text-sm font-medium text-neutral-400">No messages yet. Send a message to start the conversation!</p>
            </div>
          ) : (
            uniqueMessages.map((msg) => {
              const isMine = msg.fromUserId === currentUserId;
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[85%] ${isMine ? 'ml-auto' : 'mr-auto'}`}>
                  <div className={`px-4 py-2.5 rounded-2xl ${
                    isMine 
                      ? 'bg-cyan-600 text-white rounded-br-sm' 
                      : 'bg-neutral-800 text-neutral-200 border border-neutral-700/50 rounded-bl-sm'
                  }`}>
                    <p className="text-[15px] leading-snug whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <div className="text-[10px] text-neutral-500 font-medium mt-1 px-1 flex flex-row items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        <div className="p-4 bg-neutral-900 border-t border-neutral-800 shrink-0 z-10 w-full">
          <form onSubmit={handleSend} className="flex gap-2 max-w-5xl mx-auto">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="bg-cyan-600 text-white p-3 rounded-xl hover:bg-cyan-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 overflow-hidden relative">
      <header className="pt-safe pb-4 border-b border-neutral-800 flex items-center gap-3 px-4 md:px-8 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold text-white truncate flex items-center gap-2">
            Direct Messages
          </h1>
          <p className="text-xs text-neutral-400 font-medium">Select a user to message</p>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-4 md:px-8 space-y-2">
        {sortedMembers.length === 0 ? (
          <div className="text-center text-neutral-500 mt-8">No other members found in your town.</div>
        ) : (
          sortedMembers.map(member => {
            const unreadCount = directMessages.filter(m => m.fromUserId === member.id && m.toUserId === currentUserId && !seenMessageIds.includes(m.id)).length;
            const messagesWithUser = directMessages.filter(m => m.fromUserId === member.id || m.toUserId === member.id);
            const lastMessage = messagesWithUser.length > 0 ? messagesWithUser[messagesWithUser.length - 1] : null;

            return (
              <button 
                key={member.id} 
                onClick={() => setSelectedUser(member)}
                className="w-full text-left bg-neutral-900/50 hover:bg-neutral-800/80 border border-neutral-800/80 rounded-xl p-4 flex items-center gap-4 transition-colors"
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 bg-cyan-900/40 text-cyan-500 rounded-full flex items-center justify-center text-lg font-bold uppercase">
                    {member.fullName.substring(0, 2)}
                  </div>
                  {isOnline(member.lastSeen) && (
                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-emerald-500 border-2 border-neutral-900 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-white font-semibold truncate">{member.fullName}</span>
                    {lastMessage && (
                      <span className="text-[10px] text-neutral-500 shrink-0">
                        {new Date(lastMessage.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm text-neutral-400">
                    <span className="truncate">
                      {lastMessage ? (lastMessage.fromUserId === currentUserId ? 'You: ' : '') + lastMessage.text : 'No messages yet'}
                    </span>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-1 shrink-0">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
