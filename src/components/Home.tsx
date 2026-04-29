import React, { useMemo, useState } from 'react';
import { Plus, Trophy, ChevronRight, Calendar, Trash2, User as UserIcon, X, QrCode, Sun, Moon } from 'lucide-react';
import { useAppContext } from '../store';
import { Logo } from './Logo';
import { auth } from '../firebase';
import { UserProfileModal } from './UserProfileModal';

export function Home({ onNavigate }: { onNavigate: (route: string) => void }) {
  const { tournaments, setActiveTournament, deleteTournament, theme, toggleTheme } = useAppContext();
  const [showProfile, setShowProfile] = useState(false);
  const user = auth.currentUser;

  const groupedTournaments = useMemo(() => {
    const groups: { [key: string]: typeof tournaments } = {};
    
    // Sort by createdAt descending
    const sorted = [...tournaments].sort((a, b) => {
        const da = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const db = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return db - da;
    });
    
    sorted.forEach(t => {
      const tMs = t.createdAt?.toMillis ? t.createdAt.toMillis() : (t.createdAt ? new Date(t.createdAt).getTime() : Date.now());
      const date = new Date(tMs);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateString = '';
      if (date.toDateString() === today.toDateString()) {
        dateString = 'Hoy';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateString = 'Ayer';
      } else {
        dateString = date.toLocaleDateString('es-ES', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      }
      
      if (!groups[dateString]) groups[dateString] = [];
      groups[dateString].push(t);
    });
    
    return groups;
  }, [tournaments]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white font-sans pb-24 relative">
      <header className="px-6 pt-12 pb-4 bg-zinc-950 flex justify-between items-start">
        <div>
          <Logo />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-3 text-zinc-400 bg-zinc-900 rounded-2xl hover:bg-zinc-800 transition-colors flex flex-col items-center border border-zinc-800/50">
             {theme === 'dark' ? <Sun className="w-5 h-5 mb-1" /> : <Moon className="w-5 h-5 mb-1" />}
             <span className="text-[10px] font-bold uppercase tracking-wider">Tema</span>
          </button>
          <button onClick={() => setShowProfile(true)} className="p-3 text-zinc-400 bg-zinc-900 rounded-2xl hover:bg-zinc-800 transition-colors flex flex-col items-center border border-zinc-800/50">
             <UserIcon className="w-5 h-5 mb-1" />
             <span className="text-[10px] font-bold uppercase tracking-wider">Mi Perfil</span>
          </button>
          <button onClick={() => onNavigate('global-rankings')} className="p-3 text-yellow-500 bg-yellow-500/10 rounded-2xl hover:bg-yellow-500/20 transition-colors flex flex-col items-center">
             <Trophy className="w-5 h-5 mb-1" />
             <span className="text-[10px] font-bold uppercase tracking-wider">Top Global</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 pt-6">
        {tournaments.length === 0 ? (
          <div className="text-center py-16 px-6 bg-zinc-900 border border-zinc-800 rounded-3xl">
            <Trophy className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-sm font-medium text-zinc-400">Aún no has creado ningún torneo.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedTournaments).map(([dateLabel, dateTournaments]) => (
              <div key={dateLabel} className="space-y-4">
                <h2 className="text-xs font-bold text-yellow-500/80 uppercase tracking-widest pl-2">
                  {dateLabel}
                </h2>
                <div className="space-y-4">
                  {(dateTournaments as typeof tournaments).map(t => (
                    <div
                      key={t.id}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800/50 transition-colors rounded-3xl flex flex-col group overflow-hidden cursor-pointer"
                      onClick={() => {
                        setActiveTournament(t.id);
                        onNavigate('tournament');
                      }}
                    >
                      <div className="flex-1 text-left p-6">
                        <div className="flex items-start justify-between mb-8">
                          <h3 className="font-bold text-xl text-white leading-tight">
                            {t.name}
                          </h3>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              if(confirm('¿Eliminar torneo definitivamente?')) {
                                deleteTournament(t.id);
                              }
                            }}
                            className="text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-colors p-2 rounded-full cursor-pointer flex items-center justify-center -m-2"
                          >
                            <Trash2 className="w-5 h-5" />
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm font-medium text-zinc-400">
                          <span>{t.matches.length > 0 ? Math.max(...t.matches.map(m => m.round)) : 0} rondas</span>
                          <span>{t.players.length} jugadores</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <div className="fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none z-40">
        <button
          onClick={() => { if(navigator.vibrate) navigator.vibrate(50); onNavigate('create'); }}
          className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-600 border border-yellow-300 text-black font-black uppercase text-sm tracking-widest py-4 px-8 rounded-full shadow-[0_0_30px_rgba(234,179,8,0.5)] transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 pointer-events-auto"
        >
          <div className="border border-black rounded p-0.5">
            <Plus className="w-4 h-4 stroke-[3] pointer-events-none" />
          </div>
          Nuevo Torneo
        </button>
      </div>

      {showProfile && user && (
        <UserProfileModal user={user} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
