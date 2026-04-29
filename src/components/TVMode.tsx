import React, { useEffect, useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { Match } from '../domain/tournament';
import { ArrowLeft } from 'lucide-react';

export function TVMode({ tournamentId, onNavigate }: { tournamentId: string, onNavigate?: (route: string) => void }) {
  const { tournaments } = useAppContext();
  const tournament = tournaments.find(t => t.id === tournamentId);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!tournament) {
    return (
      <div className="w-full h-screen bg-black text-white flex items-center justify-center text-4xl">
        Cargando torneo...
      </div>
    );
  }

  // Get active matches
  const rounds = useMemo(() => {
    const r: Record<number, Match[]> = {};
    tournament.matches.forEach(m => {
      if (!m.isPlayoff) {
        if (!r[m.round]) r[m.round] = [];
        r[m.round].push(m);
      }
    });
    return r;
  }, [tournament.matches]);

  const maxRegularRound = useMemo(() => Math.max(0, ...Object.keys(rounds).map(Number)), [rounds]);

  const activeRound = useMemo(() => {
    if (maxRegularRound === 0) return 1;
    let current = 1;
    for (let r = 1; r <= maxRegularRound; r++) {
       const matchesInRound = rounds[r] || [];
       if (matchesInRound.length > 0 && matchesInRound.some(m => m.score1 === null)) {
          return r;
       }
       current = r;
    }
    const playoffMatches = tournament.matches.filter(m => m.isPlayoff);
    if (playoffMatches.length > 0) {
      const playoffHasUnfinished = playoffMatches.some(m => m.score1 === null);
      const semis = playoffMatches.filter(m => m.playoffType === 'semifinal');
      const finalMatch = playoffMatches.find(m => m.playoffType === 'final');
      if (playoffHasUnfinished) {
         if (semis.length > 0 && semis.some(m => m.score1 === null)) return maxRegularRound + 1;
         return maxRegularRound + (semis.length > 0 ? 2 : 1);
      } else {
         if (semis.length > 0 && !finalMatch) {
            return maxRegularRound + 1;
         }
         return maxRegularRound + (semis.length > 0 ? 2 : 1);
      }
    }
    return current;
  }, [rounds, maxRegularRound, tournament.matches]);

  const activeMatches = useMemo(() => {
    const playoffMatches = tournament.matches.filter(m => m.isPlayoff);
    if (activeRound > maxRegularRound && playoffMatches.length > 0) {
       // We are in playoffs
       const semis = playoffMatches.filter(m => m.playoffType === 'semifinal');
       if (activeRound === maxRegularRound + 1 && semis.length > 0) {
          return semis.filter(m => m.score1 === null);
       } else {
          return playoffMatches.filter(m => (m.playoffType === 'final' || m.playoffType === 'third_place') && m.score1 === null);
       }
    } else {
      return (rounds[activeRound] || []).filter(m => m.score1 === null);
    }
  }, [activeRound, maxRegularRound, rounds, tournament.matches]);

  const getPlayerName = (id: string) => {
    const p = tournament.players.find(pl => pl.id === id);
    return p ? p.name : 'Desc';
  };

  return (
    <div className="w-full h-screen bg-black text-white flex flex-col font-sans overflow-hidden">
        <header className="px-10 py-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950 shrink-0">
           <div className="flex items-center gap-6">
              {onNavigate && (
                 <button onClick={() => onNavigate('tournament')} className="p-3 mr-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-8 h-8" />
                 </button>
              )}
              <img src="/logo.png" alt="Machos Padel" className="h-16 object-contain" />
              <div>
                  <h1 className="text-4xl font-black tracking-widest uppercase text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600">
                     {tournament.name}
                  </h1>
                  <p className="text-xl text-zinc-400 font-bold uppercase tracking-widest mt-1">
                     Ronda {activeRound}
                  </p>
              </div>
           </div>
           
           <div className="text-5xl font-black text-yellow-500 font-mono tracking-widest">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </div>
        </header>

        <main className="flex-1 p-10 grid gap-8 grid-cols-1 lg:grid-cols-2">
           {activeMatches.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center text-zinc-500 space-y-6">
                 <p className="text-6xl font-bold">Ronda Completada</p>
                 <p className="text-3xl">Esperando generar siguiente cuadro...</p>
              </div>
           ) : (
              activeMatches.map((match, i) => (
                 <div key={match.id} className="bg-zinc-900 border border-zinc-800 rounded-[40px] flex flex-col overflow-hidden shadow-2xl relative">
                    <div className="bg-zinc-950 py-4 text-center border-b border-zinc-800">
                       <h2 className="text-3xl font-black text-zinc-300 tracking-widest uppercase">Cancha {i + 1}</h2>
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-center items-center p-8 gap-8">
                       <div className="w-full text-center">
                          <p className="text-5xl font-bold text-white mb-4 line-clamp-1 truncate px-4">{getPlayerName(match.team1[0])}</p>
                          <p className="text-5xl font-bold text-white line-clamp-1 truncate px-4">{getPlayerName(match.team1[1])}</p>
                       </div>
                       
                       <div className="flex items-center justify-center w-full gap-6">
                          <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-red-600"></div>
                          <span className="text-4xl font-black text-red-500 italic px-4">VS</span>
                          <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-red-600"></div>
                       </div>

                       <div className="w-full text-center">
                          <p className="text-5xl font-bold text-white mb-4 line-clamp-1 truncate px-4">{getPlayerName(match.team2[0])}</p>
                          <p className="text-5xl font-bold text-white line-clamp-1 truncate px-4">{getPlayerName(match.team2[1])}</p>
                       </div>
                    </div>
                 </div>
              ))
           )}
        </main>
    </div>
  );
}
