import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Users, Circle, Clock } from 'lucide-react';
import { gasAuth, fetchFromGas } from '../services/gasService';

interface DirectMessagesProps {
  onBack?: () => void;
}

interface Member {
  id: string;
  fullName: string;
  lastSeen?: string;
}

interface DM {
  id: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  timestamp: string;
}

export default function DirectMessages({ onBack }: DirectMessagesProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [messages, setMessages] = useState<DM[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const currentUserId = gasAuth.getUserId();

  const loadData = async () => {
    try {
      const activeTown = gasAuth.getActiveTown();
      // Also update heartbeat
      await fetchFromGas('heartbeat');
      const membersData = await fetchFromGas('getMembers', { town: activeTown });
      setMembers(membersData?.filter((m: Member) => m.id !== currentUserId) || []);
      
      if (selectedUser) {
        const dms = await fetchFromGas('getDirectMessages', { targetUserId: selectedUser.id });
        setMessages(dms || []);
      }
    } catch (err) {
      console.error('Failed to load DMs or members:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedUser]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending || !selectedUser) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      await fetchFromGas('sendDirectMessage', { targetUserId: selectedUser.id, text: textToSend });
      await loadData();
    } catch (err) {
      console.error('Failed to send DM:', err);
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
          {isLoading && messages.length === 0 ? (
             <div className="flex items-center justify-center h-full text-neutral-500 gap-2">
               <div className="w-4 h-4 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin"></div>
               Loading messages...
             </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center gap-2 mt-8 opacity-50 p-6 bg-neutral-900 border border-neutral-800 rounded-2xl mx-auto max-w-sm text-center">
              <Users className="w-8 h-8 text-neutral-500" />
              <p className="text-sm font-medium text-neutral-400">No messages yet. Send a message to start the conversation!</p>
            </div>
          ) : (
            messages.map((msg) => {
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

        <div className="p-4 bg-neutral-950 border-t border-neutral-800 pb-[max(1rem,env(safe-area-inset-bottom))] shrink-0 z-10 w-full">
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
        {members.length === 0 && !isLoading ? (
          <div className="text-center text-neutral-500 mt-8">No other members found in your town.</div>
        ) : (
          members.map(member => (
            <button 
              key={member.id} 
              onClick={() => setSelectedUser(member)}
              className="w-full text-left bg-neutral-900/50 hover:bg-neutral-800/80 border border-neutral-800/80 rounded-xl p-4 flex items-center gap-4 transition-colors"
            >
              <div className="w-12 h-12 bg-cyan-900/40 text-cyan-500 rounded-full flex items-center justify-center text-lg font-bold uppercase shrink-0">
                {member.fullName.substring(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold flex items-center gap-2">
                  <span className="truncate">{member.fullName}</span>
                  {isOnline(member.lastSeen) && (
                    <span className="bg-emerald-500/10 text-emerald-500 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/20">Online</span>
                  )}
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {isOnline(member.lastSeen) ? 'Active now' : member.lastSeen ? `Last seen ${new Date(member.lastSeen).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}` : 'Offline'}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
