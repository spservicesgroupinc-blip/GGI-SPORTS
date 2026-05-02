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
    <div className="flex-1 overflow-y-auto p-3 md:p-8 bg-slate-950 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tighter">Welcome back, {fullName.split(' ')[0]}!</h1>
          <p className="text-slate-400 mt-1 md:mt-2 text-base md:text-lg">Here is your {activeTown} club overview.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 md:p-6 flex flex-col items-center justify-center text-center shadow-lg backdrop-blur-sm">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-900/30 text-indigo-500 rounded-2xl flex items-center justify-center mb-3 md:mb-4">
              <Ticket className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="text-3xl md:text-4xl font-black text-white">{myEvents.length}</div>
            <div className="text-[10px] md:text-xs text-slate-400 font-semibold uppercase tracking-widest mt-0.5 md:mt-1">Registrations</div>
          </div>
          
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 md:p-6 flex flex-col items-center justify-center text-center shadow-lg backdrop-blur-sm">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-900/30 text-indigo-500 rounded-2xl flex items-center justify-center mb-3 md:mb-4">
              <MapPin className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="text-3xl md:text-4xl font-black text-white">{towns.length}</div>
            <div className="text-[10px] md:text-xs text-slate-400 font-semibold uppercase tracking-widest mt-0.5 md:mt-1">Towns Joined</div>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 md:p-6 flex flex-col items-center justify-center text-center shadow-lg backdrop-blur-sm">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-indigo-900/30 text-indigo-500 rounded-2xl flex items-center justify-center mb-3 md:mb-4">
              <CalendarIcon className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="text-3xl md:text-4xl font-black text-white">{events.length}</div>
            <div className="text-[10px] md:text-xs text-slate-400 font-semibold uppercase tracking-widest mt-0.5 md:mt-1">Active Events</div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-bold text-white">Your Upcoming Events</h2>
            <button onClick={onViewEvents} className="text-xs md:text-sm text-indigo-400 hover:text-indigo-300 font-semibold px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 transition-all">View All</button>
          </div>
          
          {upcomingEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {upcomingEvents.map(event => (
                <div key={event.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 flex flex-col shadow-lg hover:border-indigo-500/50 transition-all group">
                  <h3 className="font-bold text-white text-base md:text-lg leading-tight mb-2 md:mb-3 line-clamp-1 group-hover:text-indigo-400 transition-colors">{event.title}</h3>
                  <div className="flex items-center text-xs md:text-sm text-slate-400 mb-1.5 md:mb-2">
                    <CalendarIcon className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2 text-indigo-500 shrink-0" />
                    {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center text-xs md:text-sm text-slate-400 mb-4 md:mb-6 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 mr-2 text-indigo-500 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                  <div className="mt-auto pt-3 md:pt-4 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] md:text-xs text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 md:px-3 md:py-1 rounded-full border border-sky-500/20">Going</span>
                    <div className="flex items-center text-xs md:text-sm text-slate-500 font-medium">
                      <Users className="w-3.5 h-3.5 md:w-4 md:h-4 mr-1 md:mr-1.5" /> {event.attendees?.length || 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center shadow-lg backdrop-blur-sm">
              <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
                <CalendarIcon className="w-10 h-10 text-slate-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No upcoming events</h3>
              <p className="text-slate-400 text-base mb-8 max-w-sm">You haven't registered for any events yet. Check out the event board to find what's happening!</p>
              <button                onClick={onViewEvents}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm md:text-base font-bold px-6 md:px-8 py-3 md:py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-900/20"
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
