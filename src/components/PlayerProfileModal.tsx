import React, { useMemo } from 'react';
import { X, TrendingUp, Users, Target, Shield, Zap, Medal, Trophy, CalendarDays } from 'lucide-react';
import { useAppContext } from '../store';
import { calculateStandings } from '../domain/tournament';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

interface PlayerProfileModalProps {
  playerName: string;
  onClose: () => void;
}

export function PlayerProfileModal({ playerName, onClose }: PlayerProfileModalProps) {
  const { tournaments } = useAppContext();
  const searchName = playerName.trim().toLowerCase();

  const stats = useMemo(() => {
    let matchesPlayed = 0;
    let matchesWon = 0;
    let totalPointsWon = 0;
    let totalPointsLost = 0;

    const partners: Record<string, { name: string, wins: number, total: number }> = {};
    const tHistory: { tournamentName: string, date: Date | null, position: number, isWinner: boolean, points: number }[] = [];
    
    let currentStreakCount = 0;
    let isActiveStreak = true;
    
    // Process tournaments for history
    tournaments.forEach(t => {
      const ts = calculateStandings(t);
      const isTourneyCompleted = t.status === 'completed' || t.matches.length > 0;
      const tDate = t.createdAt?.toMillis ? new Date(t.createdAt.toMillis()) : t.createdAt ? new Date(t.createdAt) : null;
      
      const playerIndex = ts.findIndex(p => p.name.trim().toLowerCase() === searchName);
      if (playerIndex !== -1) {
          const pStat = ts[playerIndex];
          if (pStat.matchesPlayed > 0) {
              tHistory.push({
                   tournamentName: t.name,
                   date: tDate,
                   position: playerIndex + 1,
                   isWinner: isTourneyCompleted && playerIndex === 0,
                   points: pStat.pointsWon
              });
          }
      }
    });

    tHistory.sort((a, b) => {
       if (!a.date) return 1;
       if (!b.date) return -1;
       return b.date.getTime() - a.date.getTime();
    });

    // Gather all matches for this player by name across all tournaments
    const allPlayerMatches = tournaments.flatMap(t => {
      const playerInTournament = t.players.find(p => p.name.trim().toLowerCase() === searchName);
      if (!playerInTournament) return [];
      const pid = playerInTournament.id;
      
      return t.matches
        .filter(m => (m.team1.includes(pid) || m.team2.includes(pid)) && m.score1 !== null && m.score2 !== null)
        .map(m => ({
            ...m,
            playerIdInThisTournament: pid,
            tournamentDate: t.createdAt,
            tournamentPlayers: t.players
        }));
    }).sort((a, b) => {
        const aDate = a.tournamentDate?.toMillis ? a.tournamentDate.toMillis() : (a.tournamentDate ? new Date(a.tournamentDate).getTime() : 0);
        const bDate = b.tournamentDate?.toMillis ? b.tournamentDate.toMillis() : (b.tournamentDate ? new Date(b.tournamentDate).getTime() : 0);
        if (aDate !== bDate) return bDate - aDate;
        return b.round - a.round; // Sort round descending
    });

    for (const m of allPlayerMatches) {
        matchesPlayed++;
        const pid = m.playerIdInThisTournament;
        const isTeam1 = m.team1.includes(pid);
        const isWin = isTeam1 ? m.score1! > m.score2! : m.score2! > m.score1!;
        const ptsWon = isTeam1 ? m.score1! : m.score2!;
        const ptsLost = isTeam1 ? m.score2! : m.score1!;
        
        totalPointsWon += ptsWon;
        totalPointsLost += ptsLost;

        if (isWin) matchesWon++;

        // Streak logic (since we sorted newest first)
        if (isActiveStreak) {
           if (isWin) currentStreakCount++;
           else isActiveStreak = false;
        }

        // Partner logic
        const partnerId = isTeam1 ? m.team1.find(p => p !== pid) : m.team2.find(p => p !== pid);
        if (partnerId) {
            const partnerNameFull = m.tournamentPlayers.find(p => p.id === partnerId)?.name || 'Desconocido';
            const partnerKey = partnerNameFull.trim().toLowerCase();
            if (!partners[partnerKey]) partners[partnerKey] = { name: partnerNameFull, wins: 0, total: 0 };
            partners[partnerKey].total++;
            if (isWin) partners[partnerKey].wins++;
        }
    }
    
    const bestPartners = Object.values(partners)
      .filter(p => p.total > 0)
      .sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins;
          return (b.wins/b.total) - (a.wins/a.total);
      });

    return {
       matchesPlayed,
       matchesWon,
       matchesLost: matchesPlayed - matchesWon,
       winRate: matchesPlayed > 0 ? (matchesWon / matchesPlayed) * 100 : 0,
       totalPointsWon,
       bestPartner: bestPartners.length > 0 ? bestPartners[0] : null,
       currentStreakCount,
       history: tHistory
    };
  }, [tournaments, searchName]);

  const pieData = [
    { name: 'Victorias', value: stats.matchesWon, color: '#10B981' },
    { name: 'Derrotas', value: stats.matchesLost, color: '#EF4444' }
  ];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-t-[32px] sm:rounded-[32px] w-full max-w-sm max-h-[90vh] overflow-hidden flex flex-col shadow-[0_20px_60px_-15px_rgba(0,0,0,1)] animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 relative">
        
        <div className="bg-zinc-900 border-b border-zinc-800 relative z-10 px-6 py-5 flex justify-between items-center text-center">
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 uppercase tracking-wider line-clamp-1 text-left flex-1">{playerName}</h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-white p-2 rounded-full bg-zinc-800 ml-2 shrink-0">
                <X className="w-5 h-5" />
            </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto bg-gradient-to-b from-zinc-900/50 to-zinc-950 pb-12">
           {/* General Stats */}
           <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-[20px] shadow-sm relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="text-zinc-500 text-[10px] font-bold mb-1 uppercase tracking-widest flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-blue-400"/> Win Rate</div>
                 <div className="text-3xl font-black text-white">{stats.winRate.toFixed(0)}%</div>
              </div>
              <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-[20px] shadow-sm relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div className="text-zinc-500 text-[10px] font-bold mb-1 uppercase tracking-widest flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-yellow-500"/> Racha Actual</div>
                 <div className="text-3xl font-black text-white">{stats.currentStreakCount} <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Vic.</span></div>
              </div>
           </div>

           {/* Chart */}
           <div className="bg-zinc-950 border border-zinc-800/80 p-5 rounded-[24px] flex flex-col items-center relative overflow-hidden">
               <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-50"></div>
               <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest self-start mb-4">Partidos Totales: <span className="text-white text-xs">{stats.matchesPlayed}</span></h3>
               {stats.matchesPlayed > 0 ? (
                   <div className="w-full h-44 relative">
                     <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                             <Pie
                               data={pieData}
                               cx="50%"
                               cy="50%"
                               innerRadius={55}
                               outerRadius={80}
                               paddingAngle={5}
                               dataKey="value"
                               stroke="none"
                               cornerRadius={4}
                             >
                               {pieData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.color} />
                               ))}
                             </Pie>
                             <RechartsTooltip 
                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#fff', fontSize: '13px', fontWeight: 'bold', border: '1px solid #3f3f46' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value: number) => [`${value} partidos`, '']}
                             />
                         </PieChart>
                     </ResponsiveContainer>
                     <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-black text-emerald-400 leading-none">{stats.matchesWon}</span>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Gana</span>
                     </div>
                   </div>
               ) : (
                   <div className="h-40 flex items-center justify-center w-full">
                       <p className="text-zinc-600 text-sm font-medium">Sin datos suficientes</p>
                   </div>
               )}
               <div className="flex justify-center gap-6 mt-4 w-full">
                   <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Victorias ({stats.matchesWon})</span></div>
                   <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div><span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Derrotas ({stats.matchesLost})</span></div>
               </div>
           </div>

           {/* Best Partner */}
           <div className="bg-gradient-to-br from-indigo-900/40 via-zinc-950 to-zinc-950 border border-indigo-500/20 p-5 rounded-[24px] relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Users className="w-16 h-16 text-indigo-500" />
               </div>
               <div className="flex items-center gap-2 mb-4 relative z-10">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Compañero Ideal</h3>
               </div>
               
               {stats.bestPartner ? (
                   <div className="flex items-center gap-4 relative z-10">
                       <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-xl shadow-inner shrink-0">
                           {stats.bestPartner.name.substring(0, 2).toUpperCase()}
                       </div>
                       <div>
                           <p className="text-lg font-bold text-white leading-tight">{stats.bestPartner.name}</p>
                           <p className="text-xs text-indigo-300/70 font-medium mt-0.5">{stats.bestPartner.wins} victorias juntos <span className="text-zinc-600">({stats.bestPartner.total} p.)</span></p>
                       </div>
                   </div>
               ) : (
                   <p className="text-sm text-zinc-500 font-medium relative z-10">Juega más partidos para descubrirlo.</p>
               )}
           </div>
           
           {/* Tournament History */}
           {stats.history.length > 0 && (
             <div>
                <h4 className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-3 ml-1 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Historial de Torneos</h4>
                <div className="space-y-2.5">
                   {stats.history.map((h, idx) => (
                       <div key={idx} className="bg-zinc-950/50 border border-zinc-800/80 p-4 rounded-[20px] flex items-center justify-between">
                          <div>
                             <p className="font-bold text-white text-sm mb-1">{h.tournamentName}</p>
                             <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                                {h.date ? h.date.toLocaleDateString() : 'Desconocido'}
                             </p>
                          </div>
                          <div className="text-right flex flex-col items-end">
                             {h.isWinner ? (
                                <span className="bg-yellow-500/20 text-yellow-500 text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 uppercase tracking-wider">
                                   <Trophy className="w-3 h-3" /> Campeón
                                </span>
                             ) : (
                                <span className="text-zinc-400 text-xs font-bold bg-zinc-800/50 px-3 py-1 rounded-xl">
                                   #{h.position}
                                </span>
                             )}
                             <span className="text-[10px] font-bold text-emerald-500/80 mt-1.5">{h.points} pts</span>
                          </div>
                       </div>
                   ))}
                </div>
             </div>
           )}

        </div>
      </div>
    </div>
  );
}

