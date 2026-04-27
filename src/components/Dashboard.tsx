import { Calendar as CalendarIcon, MapPin, Users, Ticket } from 'lucide-react';
import { gasAuth } from '../services/gasService';

interface DashboardProps {
  events: any[];
  onViewEvents: () => void;
}

export default function Dashboard({ events, onViewEvents }: DashboardProps) {
  const fullName = gasAuth.getFullName();
  const towns = gasAuth.getTowns();
  const activeTown = gasAuth.getActiveTown();
  
  const myEvents = events.filter(e => e.attendees?.includes(fullName));
  const activeTownEvents = events.filter(e => e.town === activeTown);
  
  const upcomingEvents = myEvents
    .filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);
  
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-neutral-950 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Welcome back, {fullName.split(' ')[0]}!</h1>
          <p className="text-neutral-400 mt-1">Here is your {activeTown} club overview.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-12 h-12 bg-cyan-900/30 text-cyan-500 rounded-full flex items-center justify-center mb-3">
              <Ticket className="w-6 h-6" />
            </div>
            <div className="text-2xl font-bold text-white">{myEvents.length}</div>
            <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mt-1">Total Registrations</div>
          </div>
          
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-12 h-12 bg-emerald-900/30 text-emerald-500 rounded-full flex items-center justify-center mb-3">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="text-2xl font-bold text-white">{towns.length}</div>
            <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mt-1">Towns Joined</div>
          </div>

          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="w-12 h-12 bg-purple-900/30 text-purple-500 rounded-full flex items-center justify-center mb-3">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div className="text-2xl font-bold text-white">{events.length}</div>
            <div className="text-xs text-neutral-400 font-medium uppercase tracking-wider mt-1">Active Events</div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Upcoming Events</h2>
            <button onClick={onViewEvents} className="text-sm text-cyan-500 hover:text-cyan-400 font-medium">View All</button>
          </div>
          
          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingEvents.map(event => (
                <div key={event.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col shadow-sm hover:border-neutral-700 transition-colors">
                  <h3 className="font-semibold text-white text-base leading-tight mb-2 line-clamp-1">{event.title}</h3>
                  <div className="flex items-center text-xs text-neutral-400 mb-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center text-xs text-neutral-400 mb-4 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="mt-auto pt-3 border-t border-neutral-800 flex items-center justify-between">
                    <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">Going</span>
                    <div className="flex items-center text-xs text-neutral-500">
                      <Users className="w-3.5 h-3.5 mr-1" /> {event.attendees?.length || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 text-center flex flex-col items-center shadow-sm">
              <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon className="w-8 h-8 text-neutral-500" />
              </div>
              <h3 className="text-white font-medium mb-1">No upcoming events</h3>
              <p className="text-neutral-400 text-sm mb-4 max-w-sm">You haven't registered for any events yet. Check out the event board to find what's happening!</p>
              <button 
                onClick={onViewEvents}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors active:scale-95"
              >
                Find Events
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
