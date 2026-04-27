/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Calendar, LayoutTemplate, Users, MapPin, Clock, LogOut, Settings, MessageSquare, Bike, ArrowLeft, X, ChevronDown, UserSquare } from 'lucide-react';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import Chat from './components/Chat';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import DirectMessages from './components/DirectMessages';
import { fetchFromGas, gasAuth } from './services/gasService';

type ViewMode = 'calendar' | 'admin' | 'chat' | 'dashboard' | 'profile' | 'dms';

const TOWNS = ['Huntertown', 'Auburn', 'Garrett', 'Fort Wayne'];

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(gasAuth.isAuthenticated());
  const [view, setView] = useState<ViewMode>('dashboard');
  const [userRole, setUserRole] = useState<string>('user');
  const [activeTown, setActiveTown] = useState<string | null>(gasAuth.getActiveTown());
  const [userTowns, setUserTowns] = useState<string[]>(gasAuth.getTowns());
  const [isSwitchingTown, setIsSwitchingTown] = useState(false);
  
  const [events, setEvents] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [selectedEventUrlId, setSelectedEventUrlId] = useState<string | null>(null);
  const [registeringEventId, setRegisteringEventId] = useState<string | null>(null);

  const [seenEventIds, setSeenEventIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('seenEventIds') || '[]'); } catch { return []; }
  });
  
  const [seenMessageIds, setSeenMessageIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('seenMessageIds') || '[]'); } catch { return []; }
  });

  const [seenDirectMessageIds, setSeenDirectMessageIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('seenDirectMessageIds') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('seenEventIds', JSON.stringify(seenEventIds));
  }, [seenEventIds]);

  useEffect(() => {
    localStorage.setItem('seenMessageIds', JSON.stringify(seenMessageIds));
  }, [seenMessageIds]);

  useEffect(() => {
    localStorage.setItem('seenDirectMessageIds', JSON.stringify(seenDirectMessageIds));
  }, [seenDirectMessageIds]);

  useEffect(() => {
    if (view === 'calendar' && events.length > 0) {
      setSeenEventIds(prev => {
        const newIds = events.map(e => e.id).filter(id => !prev.includes(id));
        return newIds.length > 0 ? [...prev, ...newIds] : prev;
      });
    }
  }, [view, events]);

  useEffect(() => {
    if (view === 'chat' && messages.length > 0) {
      setSeenMessageIds(prev => {
        const newIds = messages.map(m => m.id).filter(id => !prev.includes(id));
        return newIds.length > 0 ? [...prev, ...newIds] : prev;
      });
    }
  }, [view, messages]);

  useEffect(() => {
    if (view === 'dms' && directMessages.length > 0) {
      setSeenDirectMessageIds(prev => {
        const userId = gasAuth.getUserId();
        const newIds = directMessages.filter(m => m.toUserId === userId).map(m => m.id).filter(id => !prev.includes(id));
        return newIds.length > 0 ? [...prev, ...newIds] : prev;
      });
    }
  }, [view, directMessages]);

  useEffect(() => {
    const handleUnauthorized = () => setIsAuthenticated(false);
    window.addEventListener('gas-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('gas-unauthorized', handleUnauthorized);
  }, []);

  const loadData = async () => {
    if (!isAuthenticated || !activeTown) return;
    try {
      const data = await fetchFromGas('pollData', { town: activeTown });
      if (data) {
        setEvents(data.events || []);
        setMessages(data.messages || []);
        setDirectMessages(data.directMessages || []);
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to poll data:', err);
    }
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAuthenticated && activeTown) {
      setIsLoadingEvents(true);
      loadData().finally(() => {
        setIsLoadingEvents(false);
      });
      interval = setInterval(() => {
        loadData();
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, activeTown]);

  const handleRegister = async (eventId: string) => {
    setRegisteringEventId(eventId);
    try {
      await fetchFromGas('registerForEvent', { eventId });
      await loadData();
      alert('Successfully registered!');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to register');
    } finally {
      setRegisteringEventId(null);
    }
  };

  const unreadEventsCount = events.filter(e => !seenEventIds.includes(e.id)).length;
  const unreadMessagesCount = messages.filter(m => !seenMessageIds.includes(m.id)).length;
  const unreadDirectMessagesCount = directMessages.filter(m => m.toUserId === gasAuth.getUserId() && !seenDirectMessageIds.includes(m.id)).length;

  const handleLoginSuccess = (role?: string) => {
    setIsAuthenticated(true);
    if(role) setUserRole(role);
    setActiveTown(gasAuth.getActiveTown());
    setUserTowns(gasAuth.getTowns());
  };

  const handleTownChange = async (town: string) => {
    if (!town) return;
    setIsSwitchingTown(true);
    try {
      if (!userTowns.includes(town)) {
        const res = await fetchFromGas('addTownToUser', { townToAdd: town });
        setUserTowns(res.towns || [...userTowns, town]);
        // Update gasAuth internal state if possible, though it reads from login. 
        // We'll just rely on current run state unless they refresh.
      }
      gasAuth.setActiveTown(town);
      setActiveTown(town);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to join town');
    } finally {
      setIsSwitchingTown(false);
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  const handleLogout = () => {
    gasAuth.logout();
    setIsAuthenticated(false);
    setView('calendar');
  };

  const selectedEvent = events.find(e => e.id === selectedEventUrlId);

  return (
    <div className="h-[100dvh] w-screen bg-neutral-950 text-neutral-300 font-sans flex flex-col md:flex-row overflow-hidden select-none">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-neutral-900/50 border-r border-neutral-800 flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
            <Bike className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight text-lg">GGI Youth Sports</span>
        </div>
        
        <div className="px-4 pb-4 border-b border-neutral-800">
          <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block mb-2">Active Town</label>
          <div className="relative">
            <select 
              value={activeTown || ''}
              onChange={(e) => handleTownChange(e.target.value)}
              disabled={isSwitchingTown}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-3 pr-8 py-2 text-sm text-white focus:border-cyan-500 outline-none appearance-none disabled:opacity-50"
            >
              <option value="" disabled>Select Town</option>
              {TOWNS.map(t => (
                <option key={t} value={t}>{t} {!userTowns.includes(t) ? '(Join)' : ''}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Navigation</div>
          <button onClick={() => setView('dashboard')} className={`relative flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${view === 'dashboard' ? 'bg-cyan-900/20 text-cyan-400 font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <LayoutTemplate className="w-5 h-5" /> <span>Dashboard</span>
          </button>
          <button onClick={() => setView('calendar')} className={`relative flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${view === 'calendar' ? 'bg-cyan-900/20 text-cyan-400 font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <Calendar className="w-5 h-5" /> <span>Event Board</span>
            {unreadEventsCount > 0 && <span className="absolute right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadEventsCount}</span>}
          </button>
          <button onClick={() => setView('chat')} className={`relative flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${view === 'chat' ? 'bg-cyan-900/20 text-cyan-400 font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <MessageSquare className="w-5 h-5" /> <span>Messaging</span>
            {unreadMessagesCount > 0 && <span className="absolute right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadMessagesCount}</span>}
          </button>
          <button onClick={() => setView('dms')} className={`relative flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${view === 'dms' ? 'bg-cyan-900/20 text-cyan-400 font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <Users className="w-5 h-5" /> <span>Direct Messages</span>
            {unreadDirectMessagesCount > 0 && <span className="absolute right-3 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadDirectMessagesCount}</span>}
          </button>
          <button onClick={() => setView('profile')} className={`relative flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${view === 'profile' ? 'bg-cyan-900/20 text-cyan-400 font-medium' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <UserSquare className="w-5 h-5" /> <span>Profile</span>
          </button>
        </nav>

        <div className="p-4 border-t border-neutral-800 space-y-4">
          <div className="flex items-center justify-between gap-2 p-2.5 bg-neutral-800/50 rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-cyan-700 flex items-center justify-center text-white text-xs font-bold shrink-0 uppercase">
                ME
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">{gasAuth.getFullName()}</div>
                <div className="text-[10px] text-neutral-500 uppercase font-semibold">{userRole}</div>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-neutral-500 hover:text-white transition-colors p-2 bg-neutral-900 rounded-lg"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center text-[10px] text-neutral-600 px-2 mt-4 font-medium leading-tight">
            Grant, Grace, and Isaiah Russell are the owners of this club
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {view === 'admin' ? (
          <AdminPanel 
            onBack={() => setView('calendar')} 
            userRole={userRole} 
            onRoleUpdate={setUserRole} 
          />
        ) : view === 'chat' ? (
          <main className="flex-1 flex flex-col h-full overflow-hidden">
            <Chat onBack={() => setView('calendar')} key={activeTown} messages={messages} isLoading={isLoadingEvents} onRefresh={loadData} />
          </main>
        ) : view === 'dms' ? (
          <main className="flex-1 flex flex-col h-full overflow-hidden">
            <DirectMessages onBack={() => setView('dashboard')} directMessages={directMessages} members={members} />
          </main>
        ) : view === 'profile' ? (
          <main className="flex-1 flex flex-col h-full overflow-hidden">
            <Profile onBack={() => setView('dashboard')} />
          </main>
        ) : view === 'dashboard' ? (
          <Dashboard events={events} onViewEvents={() => setView('calendar')} />
        ) : (
          <div className="flex-1 flex overflow-hidden">
            <main className="flex-1 flex flex-col h-full bg-neutral-950 overflow-y-auto">
              <header className="pt-safe pb-4 border-b border-neutral-800 flex items-center justify-between px-4 md:px-8 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
                <div className="flex-1 min-w-0 mr-4">
                  <h1 className="text-xl md:text-2xl font-semibold text-white truncate">Upcoming Events</h1>
                  <div className="flex items-center gap-2 mt-1 md:hidden">
                    <select 
                      value={activeTown || ''}
                      onChange={(e) => handleTownChange(e.target.value)}
                      disabled={isSwitchingTown}
                      className="bg-transparent text-xs text-neutral-400 font-medium outline-none appearance-none pr-4 max-w-full"
                    >
                      <option value="" disabled>Select Town</option>
                      {TOWNS.map(t => (
                        <option key={t} value={t}>{t} {!userTowns.includes(t) ? '(Join)' : ''}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-neutral-500 -ml-5 pointer-events-none" />
                  </div>
                  <p className="hidden md:block text-[10px] md:text-xs text-neutral-500 uppercase tracking-widest mt-0.5">Explore & Register</p>
                </div>
                <button 
                  onClick={() => setView('admin')}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all shadow-lg shadow-cyan-900/20 flex items-center gap-2 shrink-0"
                >
                  <Settings className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden md:inline">Admin Panel</span>
                </button>
              </header>

              <div className="p-4 md:p-8 max-w-5xl mx-auto w-full flex-1 md:pb-8">
                {isLoadingEvents ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="animate-pulse text-neutral-500 flex items-center gap-2">
                      <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                      <div className="w-2 h-2 bg-cyan-500 rounded-full animation-delay-200"></div>
                      <div className="w-2 h-2 bg-cyan-500 rounded-full animation-delay-400"></div>
                    </div>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-20 px-6 rounded-2xl border border-dashed border-neutral-800 mt-10">
                    <Calendar className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white">No Events Available</h3>
                    <p className="text-sm text-neutral-500 mt-2">Check back later or contact an administrator.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                    {events.map((evt) => {
                      const isSelected = selectedEventUrlId === evt.id;
                      return (
                        <div 
                          key={evt.id} 
                          onClick={() => setSelectedEventUrlId(evt.id)}
                          className={`bg-neutral-900 rounded-2xl overflow-hidden border transition-all cursor-pointer ${
                            isSelected ? 'border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.1)] ring-1 ring-cyan-500/50' : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50'
                          }`}
                        >
                          <div className="p-4 md:p-5">
                            <h3 className="text-base md:text-lg font-semibold text-white mb-2">{evt.title}</h3>
                            <div className="space-y-1.5 md:space-y-2 mt-3 md:mt-4">
                              <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-400">
                                <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                                {new Date(evt.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                              </div>
                              <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-400">
                                <Clock className="w-3.5 h-3.5 text-cyan-500" />
                                {new Date(evt.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div className="flex items-center gap-2 text-xs md:text-sm text-neutral-400">
                                <MapPin className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                                <span className="truncate">{evt.location}</span>
                              </div>
                            </div>
                          </div>
                          <div className="px-4 md:px-5 py-3 bg-neutral-950/50 border-t border-neutral-800 flex items-center justify-between">
                            <div className="text-[10px] md:text-xs font-medium text-neutral-500">
                              {evt.currentRegistrations} / {evt.capacity} registered
                            </div>
                            <div className="text-[10px] md:text-xs font-semibold text-cyan-500 flex items-center gap-1">
                              Details &rarr;
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </main>

            {/* Right Panel - Event Details (Desktop only, mobile handled via overlay) */}
            <aside className="hidden lg:flex w-80 bg-neutral-900/30 border-l border-neutral-800 flex-col shrink-0">
              {selectedEvent ? (
                <div className="p-6 h-full flex flex-col overflow-y-auto space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">{selectedEvent.title}</h2>
                    <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 bg-cyan-900/30 text-cyan-400 w-fit rounded-full">
                      {selectedEvent.currentRegistrations} / {selectedEvent.capacity} spots filled
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-neutral-800">
                    <div className="flex items-start gap-3 text-neutral-300">
                      <Calendar className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">Date & Time</div>
                        <div className="text-sm text-neutral-500">
                          {new Date(selectedEvent.date).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 text-neutral-300">
                      <MapPin className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">Location</div>
                        <div className="text-sm text-neutral-500">{selectedEvent.location}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-neutral-800">
                    <div className="text-sm font-medium text-neutral-300 mb-2">About this event</div>
                    <p className="text-sm text-neutral-500 leading-relaxed whitespace-pre-wrap">
                      {selectedEvent.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-neutral-800">
                    <div className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-neutral-400" /> Event Map
                    </div>
                    <div className="w-full h-48 bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 relative z-0">
                      <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedEvent.location || selectedEvent.town)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                      ></iframe>
                    </div>
                  </div>

                  {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                    <div className="pt-4 border-t border-neutral-800">
                      <div className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-neutral-400" /> Attendees ({selectedEvent.attendees.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedEvent.attendees.map((name: string, index: number) => (
                          <div key={index} className="px-3 py-1.5 bg-neutral-800/80 text-neutral-300 text-xs font-medium rounded-full border border-neutral-700/50">
                            {name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-6">
                    {selectedEvent.currentRegistrations >= selectedEvent.capacity ? (
                      <button disabled className="w-full py-3 bg-neutral-800 text-neutral-500 rounded-xl text-sm font-semibold cursor-not-allowed">
                        Event is Full
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRegister(selectedEvent.id)}
                        disabled={registeringEventId === selectedEvent.id}
                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2"
                      >
                        {registeringEventId === selectedEvent.id ? 'Registering...' : 'Register for Event'}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 h-full flex flex-col items-center justify-center text-center space-y-4 text-neutral-500">
                  <LayoutTemplate className="w-12 h-12 text-neutral-800" />
                  <div>
                    <h3 className="text-sm font-medium text-neutral-400">No Event Selected</h3>
                    <p className="text-xs mt-1">Select an event from the board to view details.</p>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden flex items-center justify-around bg-neutral-950 border-t border-neutral-800 pb-safe w-full z-20 shrink-0">
          <button 
            onClick={() => setView('dashboard')} 
            className={`flex flex-col items-center gap-1 p-3 w-full ${view === 'dashboard' ? 'text-cyan-400' : 'text-neutral-500'}`}
          >
            <LayoutTemplate className="w-5 h-5" />
            <span className="text-[10px] font-medium hidden sm:block">Dashboard</span>
          </button>
          <button 
            onClick={() => setView('calendar')} 
            className={`relative flex flex-col items-center gap-1 p-3 w-full ${view === 'calendar' ? 'text-cyan-400' : 'text-neutral-500'}`}
          >
            <div className="relative">
              <Calendar className="w-5 h-5" />
              {unreadEventsCount > 0 && <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold px-1 min-w-[14px] text-center rounded-full border border-neutral-950">{unreadEventsCount}</span>}
            </div>
            <span className="text-[10px] font-medium hidden sm:block">Events</span>
          </button>
          <button 
            onClick={() => setView('chat')} 
            className={`relative flex flex-col items-center gap-1 p-3 w-full ${view === 'chat' ? 'text-cyan-400' : 'text-neutral-500'}`}
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5" />
              {unreadMessagesCount > 0 && <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold px-1 min-w-[14px] text-center rounded-full border border-neutral-950">{unreadMessagesCount}</span>}
            </div>
            <span className="text-[10px] font-medium hidden sm:block">Chat</span>
          </button>
          
          <button 
            onClick={() => setView('dms')} 
            className={`relative flex flex-col items-center gap-1 p-3 w-full ${view === 'dms' ? 'text-cyan-400' : 'text-neutral-500'}`}
          >
            <div className="relative">
              <Users className="w-5 h-5" />
              {unreadDirectMessagesCount > 0 && <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[8px] font-bold px-1 min-w-[14px] text-center rounded-full border border-neutral-950">{unreadDirectMessagesCount}</span>}
            </div>
            <span className="text-[10px] font-medium hidden sm:block">DMs</span>
          </button>

          <button 
            onClick={() => setView('profile')} 
            className={`relative flex flex-col items-center gap-1 p-3 w-full ${view === 'profile' ? 'text-cyan-400' : 'text-neutral-500'}`}
          >
            <UserSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium hidden sm:block">Profile</span>
          </button>

          {userRole === 'admin' && (
            <button 
              onClick={() => setView('admin')} 
              className={`flex flex-col items-center gap-1 p-3 w-full ${view === 'admin' ? 'text-purple-400' : 'text-neutral-500'}`}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px] font-medium hidden sm:block">Admin</span>
            </button>
          )}
        </nav>

        {/* Mobile Event Details Overlay */}
        {selectedEvent && view === 'calendar' && (
          <div className="lg:hidden absolute inset-0 z-30 bg-neutral-950 flex flex-col slide-in-bottom animate-in fade-in duration-200">
            <header className="pt-safe pb-4 border-b border-neutral-800 flex items-center px-4 sticky top-0 bg-neutral-950 shrink-0 gap-4">
              <button 
                onClick={() => setSelectedEventUrlId(null)} 
                className="p-3 -ml-2 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors rounded-full"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-bold text-white truncate flex-1">{selectedEvent.title}</h2>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1 bg-cyan-900/30 text-cyan-400 w-fit rounded-full">
                {selectedEvent.currentRegistrations} / {selectedEvent.capacity} spots filled
              </div>

              <div className="space-y-4 pt-4 border-t border-neutral-800">
                <div className="flex items-start gap-3 text-neutral-300">
                  <Calendar className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Date & Time</div>
                    <div className="text-sm text-neutral-500">
                      {new Date(selectedEvent.date).toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-neutral-300">
                  <MapPin className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Location</div>
                    <div className="text-sm text-neutral-500">{selectedEvent.location}</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-800">
                <div className="text-sm font-medium text-neutral-300 mb-2">About this event</div>
                <p className="text-sm text-neutral-500 leading-relaxed whitespace-pre-wrap">
                  {selectedEvent.description}
                </p>
              </div>

              <div className="pt-4 border-t border-neutral-800">
                <div className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-neutral-400" /> Event Map
                </div>
                <div className="w-full h-48 bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 relative z-0">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedEvent.location || selectedEvent.town)}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                  ></iframe>
                </div>
              </div>

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="pt-4 border-t border-neutral-800 pb-2">
                  <div className="text-sm font-medium text-neutral-300 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-neutral-400" /> Attendees ({selectedEvent.attendees.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedEvent.attendees.map((name: string, index: number) => (
                      <div key={index} className="px-3 py-1.5 bg-neutral-800/80 text-neutral-300 text-xs font-medium rounded-full border border-neutral-700/50">
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-neutral-950 border-t border-neutral-800 shrink-0 pb-safe">
              {selectedEvent.currentRegistrations >= selectedEvent.capacity ? (
                <button disabled className="w-full py-3.5 bg-neutral-800 text-neutral-500 rounded-xl text-sm font-semibold cursor-not-allowed">
                  Event is Full
                </button>
              ) : (
                <button
                  onClick={() => handleRegister(selectedEvent.id)}
                  disabled={registeringEventId === selectedEvent.id}
                  className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-cyan-900/20 transition-all flex items-center justify-center gap-2"
                >
                  {registeringEventId === selectedEvent.id ? 'Registering...' : 'Register for Event'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
