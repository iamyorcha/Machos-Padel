import { createContext, useContext, useState, useEffect } from 'react';
import { Tournament } from './domain/tournament';
import { db, auth } from './firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';

interface AppState {
  tournaments: Tournament[];
  activeTournamentId: string | null;
  theme: 'dark' | 'light';
  addTournament: (t: Tournament) => void;
  updateTournament: (t: Tournament) => void;
  deleteTournament: (id: string) => void;
  setActiveTournament: (id: string | null) => void;
  toggleTheme: () => void;
}

export const useStore = (viewerId?: string | null) => {
  const [theme, setTheme] = useState<'dark'|'light'>(() => {
    return (localStorage.getItem('padel_theme') as 'dark'|'light') || 'dark';
  });
  
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('padel_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  };

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTournamentId, setActiveTournamentId] = useState<string | null>(() => {
    if (viewerId) return viewerId;
    return localStorage.getItem('padel_active_id') || null;
  });

  useEffect(() => {
    if (activeTournamentId && !viewerId) {
      localStorage.setItem('padel_active_id', activeTournamentId);
    } else if (!viewerId) {
      localStorage.removeItem('padel_active_id');
    }
  }, [activeTournamentId, viewerId]);

  useEffect(() => {
    if (viewerId) {
      // Live Cloud Results mode - listen to a single tournament
      const unsub = onSnapshot(doc(db, 'tournaments', viewerId), (docSnap) => {
        if (docSnap.exists()) {
          setTournaments([docSnap.data() as Tournament]);
        }
      }, (error) => {
         console.error(JSON.stringify({ error: String(error), operationType: 'get', path: `tournaments/${viewerId}` }));
      });
      return unsub;
    } else {
      if (!auth.currentUser) return;
      
      const q = query(
        collection(db, 'tournaments'),
        where('ownerId', '==', auth.currentUser.uid)
      );
      
      const unsub = onSnapshot(q, (snapshot) => {
        const t: Tournament[] = [];
        snapshot.forEach(docSnap => {
          t.push(docSnap.data() as Tournament);
        });
        setTournaments(t.sort((a,b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
          return timeB - timeA;
        }));
        
        // If active tournament was deleted or doesn't exist in fetched data, clear it
        if (activeTournamentId && snapshot.docs.length > 0 && !snapshot.docs.find(d => d.id === activeTournamentId)) {
          setActiveTournamentId(null);
        }
      }, (error) => {
         console.error(JSON.stringify({ error: String(error), operationType: 'list', path: 'tournaments' }));
      });
      return unsub;
    }
  }, [viewerId, auth.currentUser]);

  const addTournament = async (t: Tournament) => {
    if (!auth.currentUser) return;
    const tournamentRef = doc(db, 'tournaments', t.id);
    const dataToSave = {
       ...t,
       ownerId: auth.currentUser.uid,
       status: 'active',
       createdAt: serverTimestamp(),
       updatedAt: serverTimestamp()
    };
    try {
      await setDoc(tournamentRef, dataToSave);
      // Let onSnapshot update local state
    } catch(e) {
      console.error(JSON.stringify({ error: String(e), operationType: 'create', path: `tournaments/${t.id}` }));
    }
  };
  
  const updateTournament = async (updated: Tournament) => {
    if (!auth.currentUser) return;
    // In viewer mode we shouldn't be updating, but just in case
    if (viewerId) return; 
    
    const tournamentRef = doc(db, 'tournaments', updated.id);
    try {
      await setDoc(tournamentRef, {
        ...updated,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch(e) {
      console.error(JSON.stringify({ error: String(e), operationType: 'update', path: `tournaments/${updated.id}` }));
    }
  };
  
  const deleteTournament = async (id: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, 'tournaments', id));
      if (activeTournamentId === id) setActiveTournamentId(null);
    } catch(e) {
      console.error(JSON.stringify({ error: String(e), operationType: 'delete', path: `tournaments/${id}` }));
    }
  };

  return {
    tournaments,
    activeTournamentId,
    theme,
    addTournament,
    updateTournament,
    deleteTournament,
    setActiveTournament: setActiveTournamentId,
    toggleTheme
  };
};

export const AppContext = createContext<ReturnType<typeof useStore> | null>(null);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
