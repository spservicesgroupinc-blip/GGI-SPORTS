import React, { useState, useEffect } from 'react';
import { fetchFromGas, gasAuth } from '../services/gasService';
import { Settings, Users, Key, Trash2, Calendar as CalendarIcon, Plus, ArrowLeft } from 'lucide-react';

interface AdminPanelProps {
  onBack: () => void;
  userRole: string;
  onRoleUpdate: (newRole: string) => void;
}

export default function AdminPanel({ onBack, userRole, onRoleUpdate }: AdminPanelProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const TOWNS = ['Huntertown', 'Auburn', 'Garrett', 'Fort Wayne'];
  const activeTown = gasAuth.getActiveTown();

  const [members, setMembers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [newPasscode, setNewPasscode] = useState('');
  const [passcodeSuccess, setPasscodeSuccess] = useState('');
  
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventCapacity, setNewEventCapacity] = useState('20');
  const [newEventTown, setNewEventTown] = useState(activeTown || '');

  useEffect(() => {
    if (isUnlocked) {
      loadAdminData();
    }
  }, [isUnlocked]);

  const loadAdminData = async () => {
    try {
      const [membersData, eventsData] = await Promise.all([
        fetchFromGas('getMembers'),
        fetchFromGas('getEvents')
      ]);
      setMembers(membersData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Failed to load admin data', err);
    }
  };

  const verifyPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await fetchFromGas('verifyAdminPasscode', { passcode });
      setIsUnlocked(true);
      onRoleUpdate('admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid passcode');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setPasscodeSuccess('');
    setError(null);
    try {
      await fetchFromGas('updateAdminPasscode', { newPasscode });
      setPasscodeSuccess('Passcode updated successfully');
      setNewPasscode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRole = async (targetUserId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await fetchFromGas('updateUserRole', { targetUserId, newRole });
      setMembers(members.map(m => m.id === targetUserId ? { ...m, role: newRole } : m));
    } catch (err) {
      alert('Failed to update role');
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await fetchFromGas('addEvent', {
        town: newEventTown,
        event: {
          title: newEventTitle,
          date: newEventDate,
          location: newEventLocation,
          description: newEventDescription,
          capacity: parseInt(newEventCapacity, 10) || 0
        }
      });
      setNewEventTitle('');
      setNewEventDate('');
      setNewEventLocation('');
      setNewEventDescription('');
      setNewEventCapacity('20');
      loadAdminData();
    } catch (err) {
      alert('Failed to add event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await fetchFromGas('deleteEvent', { id });
      loadAdminData();
    } catch (err) {
      alert('Failed to delete event');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex-1 flex flex-col h-full bg-neutral-950 p-6 items-center justify-center">
        <div className="w-full max-w-md bg-neutral-900/80 border border-neutral-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="w-12 h-12 bg-neutral-800 rounded-xl flex items-center justify-center mb-4 text-cyan-500">
              <Key className="w-6 h-6" />
            </div>
            <h2 className="text-xl text-white font-medium">Admin Access Required</h2>
            <p className="text-neutral-500 mt-2 text-sm text-center">
              Please enter the admin passcode to access this section. Default is 1234.
            </p>
          </div>

          {error && <div className="text-red-400 text-sm mb-4 text-center">{error}</div>}

          <form onSubmit={verifyPasscode} className="space-y-4">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 rounded-lg px-4 py-2.5 text-white text-sm outline-none transition-all text-center tracking-widest text-lg"
              placeholder="••••"
              required
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-semibold transition-all"
              >
                Go Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-cyan-900/20 disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Unlock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-950 overflow-y-auto">
      <header className="pt-safe pb-4 border-b border-neutral-800 flex items-center px-4 md:px-8 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-10 shrink-0 gap-4 md:gap-6">
        <button
          onClick={onBack}
          className="p-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-full transition-all flex items-center justify-center shrink-0"
          title="Exit Admin"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-semibold text-white">Admin Dashboard</h1>
          <p className="hidden md:block text-xs text-neutral-500 uppercase tracking-widest mt-0.5">
            {activeTown ? `Managing Town: ${activeTown}` : 'Manage Events & Users'}
          </p>
        </div>
      </header>

      <div className="p-6 md:p-8 max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 md:pb-8">
        
        {/* Left Column: Settings & Users */}
        <div className="space-y-8 col-span-1">
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" /> Admin Security
            </h3>
            <form onSubmit={handleUpdatePasscode} className="space-y-3">
              <label className="text-xs text-neutral-500 block">Change Admin Passcode</label>
              <input
                type="text"
                value={newPasscode}
                onChange={(e) => setNewPasscode(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-600"
                placeholder="New Passcode"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-semibold transition-all"
              >
                Update Passcode
              </button>
              {passcodeSuccess && <p className="text-green-400 text-xs mt-2">{passcodeSuccess}</p>}
              {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </form>
          </section>

          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> User Access
            </h3>
            <div className="space-y-3">
              {members.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{member.fullName}</p>
                    <p className="text-[10px] text-neutral-500 uppercase">{member.role}</p>
                  </div>
                  {member.id !== gasAuth.getUserId() && (
                    <button
                      onClick={() => handleToggleRole(member.id, member.role)}
                      className={`text-xs font-semibold px-3 py-1 rounded-md ${
                        member.role === 'admin' 
                          ? 'bg-cyan-900/40 text-cyan-400 hover:bg-cyan-900/60' 
                          : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                      }`}
                    >
                      {member.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Events */}
        <div className="col-span-2 space-y-8">
          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Event
            </h3>
            <form onSubmit={handleAddEvent} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs text-neutral-500">Event Title</label>
                <input required value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} type="text" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-600" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs text-neutral-500">Date & Time</label>
                <input required value={newEventDate} onChange={e => setNewEventDate(e.target.value)} type="datetime-local" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-600" style={{colorScheme: 'dark'}} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500">Town</label>
                <select
                  value={newEventTown}
                  onChange={(e) => setNewEventTown(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-600 rounded-lg px-3 py-2 text-white text-sm outline-none transition-all appearance-none"
                  required
                >
                  <option value="" disabled>Select Town</option>
                  {TOWNS.map(town => (
                    <option key={town} value={town}>{town}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-500">Capacity</label>
                <input required value={newEventCapacity} onChange={e => setNewEventCapacity(e.target.value)} type="number" min="1" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-600" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs text-neutral-500">Location</label>
                <input required value={newEventLocation} onChange={e => setNewEventLocation(e.target.value)} type="text" className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-600" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs text-neutral-500">Description</label>
                <textarea required value={newEventDescription} onChange={e => setNewEventDescription(e.target.value)} rows={3} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-cyan-600"></textarea>
              </div>
              <div className="col-span-2">
                <button type="submit" disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-cyan-900/20 disabled:opacity-50">
                  Publish Event
                </button>
              </div>
            </form>
          </section>

          <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" /> Manage Events
            </h3>
            <div className="space-y-4">
              {events.map((evt) => (
                <div key={evt.id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between group">
                  <div>
                    <h4 className="text-white font-medium">{evt.title}</h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      {new Date(evt.date).toLocaleString()} • {evt.location} • {evt.currentRegistrations}/{evt.capacity} spots filled
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDeleteEvent(evt.id)}
                    className="p-2 text-neutral-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {events.length === 0 && (
                <p className="text-sm text-neutral-500 text-center py-4">No events scheduled yet.</p>
              )}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
