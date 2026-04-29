import React, { useState } from 'react';
import { ArrowLeft, Users, Trophy, X, Plus, Map, Hash, Target, ChevronRight, QrCode } from 'lucide-react';
import { useAppContext } from '../store';
import { Player, Tournament, generateAmericanoMatches } from '../domain/tournament';
import { Scanner } from '@yudiel/react-qr-scanner';

export function CreateTournament({ onNavigate }: { onNavigate: (route: string) => void }) {
  const { addTournament, setActiveTournament } = useAppContext();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [pointsPerMatch, setPointsPerMatch] = useState(16);
  const [rounds, setRounds] = useState(5);
  const [courts, setCourts] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: '' },
    { id: '2', name: '' },
    { id: '3', name: '' },
    { id: '4', name: '' },
  ]);

  const handleAddPlayer = () => {
    setPlayers([...players, { id: Math.random().toString(36).slice(2, 9), name: '' }]);
  };

  const handleScan = (result: any) => {
    let value = '';
    if (typeof result === 'string') {
        value = result;
    } else if (Array.isArray(result) && result.length > 0) {
        value = result[0].rawValue || result[0].text || '';
    } else if (result && result.text) {
        value = result.text;
    }

    if (!value) return;

    try {
        const data = JSON.parse(value);
        if (data.action === 'add_player' && data.uid && data.name) {
            const exists = players.some(p => p.id === data.uid);
            if (!exists) {
                // Determine if we should replace an empty player or add a new one
                const emptyIndex = players.findIndex(p => p.name.trim() === '');
                if (emptyIndex !== -1) {
                    const newPlayers = [...players];
                    newPlayers[emptyIndex] = { id: data.uid, name: data.name };
                    setPlayers(newPlayers);
                } else {
                    setPlayers([...players, { id: data.uid, name: data.name }]);
                }
            }
            setShowScanner(false);
        }
    } catch (e) {
        console.error("Invalid QR code", e);
    }
  };

  const handleRemovePlayer = (id: string) => {
    if (players.length <= 4) return;
    setPlayers(players.filter(p => p.id !== id));
  };

  const updatePlayerName = (id: string, newName: string) => {
    setPlayers(players.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const handleNextStep = () => {
    const validPlayers = players.filter(p => p.name.trim() !== '');
    if (validPlayers.length < 4) {
      setError('Necesitas escribir al menos 4 nombres de jugadores.');
      return;
    }
    const names = validPlayers.map(p => p.name.trim().toLowerCase());
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      setError('Los nombres no pueden repetirse. Usa iniciales (ej. Pato A, Pato B).');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleCreate = () => {
    // Validate Configuration
    if (!name.trim()) {
      setError('Por favor, escribe un nombre para el torneo.');
      return;
    }
    setError(null);
    const validPlayers = players.filter(p => p.name.trim() !== '');

    const maxSimultaneousMatches = Math.floor(validPlayers.length / 4);
    const finalCourts = Math.min(courts, maxSimultaneousMatches) || 1;

    const t: Tournament = {
      id: Math.random().toString(36).slice(2, 9),
      name: name.trim(),
      type: 'americano',
      pointsPerMatch,
      players: validPlayers.map(p => ({ ...p, name: p.name.trim() })),
      matches: [],
      createdAt: Date.now(),
      courtsCount: finalCourts
    };

    t.matches = generateAmericanoMatches(t.players, rounds, finalCourts);
    
    addTournament(t);
    setActiveTournament(t.id);
    onNavigate('tournament');
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      onNavigate('home');
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white font-sans pb-24">
      <header className="pt-12 pb-4 px-6 bg-zinc-950 flex items-center gap-4">
        <button onClick={handleBack} className="p-2 -ml-2 text-yellow-500 hover:text-yellow-400 transition-colors">
          <ArrowLeft className="w-6 h-6 pointer-events-none" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-6 space-y-12">
        {step === 1 ? (
          <section className="pt-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <h2 className="text-sm font-medium text-white mb-4 text-center flex flex-col items-center">
              Añadir al menos 4 jugadores
              <span className="text-xs text-zinc-400 font-normal mt-1">
                 {players.length > 0 ? `${players.filter(p => !!p.name.trim()).length} jugadores ingresados` : ''}
              </span>
            </h2>

            <div className="space-y-0">
              {players.map((p, i) => (
                <div key={p.id} className="flex flex-row items-center -mx-6 px-6 py-2 hover:bg-zinc-900 group border-b border-zinc-800 last:border-0 transition-colors">
                  <input
                    type="text"
                    value={p.name}
                    onChange={e => updatePlayerName(p.id, e.target.value)}
                    placeholder="Escribe un nombre de jugador"
                    className="flex-1 bg-transparent border-0 px-2 py-3 text-white placeholder-zinc-500 focus:outline-none transition-colors font-medium"
                  />
                  <button
                    onClick={() => handleRemovePlayer(p.id)}
                    disabled={players.length <= 4}
                    className="p-3 text-zinc-600 hover:text-red-500 rounded-lg disabled:opacity-0 transition-colors"
                  >
                    <X className="w-5 h-5 pointer-events-none" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
               <button
                onClick={() => setShowScanner(true)}
                className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold text-sm py-3.5 px-4 rounded-xl transition-colors border border-zinc-800 flex items-center justify-center gap-2 uppercase tracking-wide"
               >
                 <QrCode className="w-5 h-5" />
                 Escanear QR
               </button>
               <button
                onClick={handleAddPlayer}
                className="bg-red-600 text-white w-14 rounded-xl shadow-sm flex flex-col items-center justify-center active:scale-95 transition-transform hover:bg-red-500 border border-red-500/50"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-8">
              <label className="block text-xl font-bold text-white mb-4">El nombre de este torneo</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Empiece a escribir.."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 text-white placeholder-zinc-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-colors"
              />
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-bold text-yellow-500/80 uppercase tracking-widest mb-4">Configuración del Torneo</h2>

              <div className="bg-zinc-900 p-4 rounded-3xl shadow-sm border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-zinc-800 text-yellow-500 rounded-2xl"><Map className="w-5 h-5"/></div>
                  <div className="text-left">
                    <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Capacidad</div>
                    <div className="text-sm font-bold text-white">Número de Pistas</div>
                  </div>
                </div>
                <div className="relative">
                  <select 
                    value={courts} 
                    onChange={e => setCourts(Number(e.target.value))}
                    className="bg-black border-none font-bold text-lg text-center rounded-2xl py-2 px-3 shadow-inner appearance-none min-w-[70px] outline-none text-white"
                  >
                    {[1,2,3,4,5,6].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="absolute right-0 top-0 bottom-0 pointer-events-none flex items-center px-2">
                     <div className="w-2 h-2 border-b-2 border-r-2 border-zinc-500 rotate-45 transform -translate-y-0.5"></div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 p-4 rounded-3xl shadow-sm border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-zinc-800 text-red-500 rounded-2xl"><Target className="w-5 h-5"/></div>
                  <div className="text-left">
                    <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Puntuación</div>
                    <div className="text-sm font-bold text-white">Puntos por Partido</div>
                  </div>
                </div>
                <div className="relative">
                  <select 
                    value={pointsPerMatch} 
                    onChange={e => setPointsPerMatch(Number(e.target.value))}
                    className="bg-black border-none font-bold text-lg text-center rounded-2xl py-2 px-3 shadow-inner appearance-none min-w-[70px] outline-none text-white"
                  >
                    <option value={16}>16</option>
                    <option value={24}>24</option>
                    <option value={32}>32</option>
                  </select>
                  <div className="absolute right-0 top-0 bottom-0 pointer-events-none flex items-center px-2">
                     <div className="w-2 h-2 border-b-2 border-r-2 border-zinc-500 rotate-45 transform -translate-y-0.5"></div>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 p-4 rounded-3xl shadow-sm border border-zinc-800 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-zinc-800 text-yellow-500 rounded-2xl"><Hash className="w-5 h-5"/></div>
                  <div className="text-left">
                    <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-0.5">Duración</div>
                    <div className="text-sm font-bold text-white">Número de Rondas</div>
                  </div>
                </div>
                <div className="relative">
                  <select 
                    value={rounds} 
                    onChange={e => setRounds(Number(e.target.value))}
                    className="bg-black border-none font-bold text-lg text-center rounded-2xl py-2 px-3 shadow-inner appearance-none min-w-[70px] outline-none text-white"
                  >
                    {[1,2,3,4,5,6,7,8,9,10].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="absolute right-0 top-0 bottom-0 pointer-events-none flex items-center px-2">
                     <div className="w-2 h-2 border-b-2 border-r-2 border-zinc-500 rotate-45 transform -translate-y-0.5"></div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <div className="p-6 bg-zinc-950 pt-2 border-t border-zinc-900 absolute bottom-0 left-0 right-0 z-10">
        {error && (
           <div className="bg-red-900/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm font-semibold animate-in fade-in">
             {error}
           </div>
        )}
        {step === 1 ? (
           <button
            onClick={handleNextStep}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-base py-4 px-6 rounded-2xl transition-colors flex items-center justify-center gap-2 border border-zinc-700"
          >
            Continuar
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-base py-4 px-6 rounded-2xl transition-colors flex items-center justify-center gap-2 border border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.3)]"
          >
            ¡Empezar juego!
            <Trophy className="w-5 h-5" />
          </button>
        )}
      </div>

      {showScanner && (
        <div className="absolute inset-0 z-50 flex flex-col bg-black animate-in fade-in duration-200">
           <div className="flex-1 relative">
             <Scanner onScan={handleScan} components={{ finder: false }} />
             
             {/* Target Overlay */}
             <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
                 <div className="w-64 h-64 border-2 border-yellow-500/50 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-yellow-500 rounded-tl-xl"></div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-yellow-500 rounded-tr-xl"></div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-yellow-500 rounded-bl-xl"></div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-yellow-500 rounded-br-xl"></div>
                 </div>
                 <p className="text-white mt-8 font-medium tracking-wide">Escanea el QR de un jugador</p>
             </div>

             <button 
               onClick={() => setShowScanner(false)} 
               className="absolute top-12 right-6 p-3 bg-zinc-900/80 rounded-full text-white z-20 backdrop-blur-sm border border-white/10"
             >
                <X className="w-6 h-6" />
             </button>
           </div>
        </div>
      )}
    </div>
  );
}
