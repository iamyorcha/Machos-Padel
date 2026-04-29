export interface Player {
  id: string;
  name: string;
}

export interface Match {
  id: string;
  round: number;
  court: number;
  team1: [string, string];
  team2: [string, string];
  score1: number | null;
  score2: number | null;
  isPlayoff?: boolean;
  playoffType?: 'semifinal' | 'third_place' | 'final';
  serveFirst?: 1 | 2;
}

export interface Tournament {
  id: string;
  name: string;
  type: 'americano' | 'mexicano';
  pointsPerMatch: number; // e.g., 24, 32
  players: Player[];
  matches: Match[];
  createdAt: any;
  updatedAt?: any;
  ownerId?: string;
  status?: 'active' | 'completed' | 'draft';
  courtsCount?: number;
  photos?: string[];
}

export function generateAmericanoMatches(players: Player[], roundsCount: number, courtsCount?: number): Match[] {
  const numPlayers = players.length;
  if (numPlayers < 4) return [];

  const maxMatches = Math.floor(numPlayers / 4);
  const matchesPerRound = courtsCount ? Math.min(maxMatches, courtsCount) : maxMatches;
  const playerIds = players.map(p => p.id);

  const history = {
    partneredWith: {} as Record<string, Record<string, number>>,
    playedAgainst: {} as Record<string, Record<string, number>>,
    matchesPlayed: {} as Record<string, number>
  };

  playerIds.forEach(id => {
    history.partneredWith[id] = {};
    history.playedAgainst[id] = {};
    history.matchesPlayed[id] = 0;
    playerIds.forEach(otherId => {
      if (id !== otherId) {
        history.partneredWith[id][otherId] = 0;
        history.playedAgainst[id][otherId] = 0;
      }
    });
  });

  const rounds: Match[] = [];

  for (let roundIndex = 0; roundIndex < roundsCount; roundIndex++) {
    let bestRound: Match[] = [];
    let bestScore = Infinity;

    // Try permutations to minimize playing with/against the same people
    for (let attempts = 0; attempts < 500; attempts++) {
      // Shuffle but prioritize players completely randomly.
      // A better heuristic is to sort by matchesPlayed first to balance resting,
      // then shuffle the groups.
      const shuffled = [...playerIds].sort(() => Math.random() - 0.5);
      
      // Stable sort by matches played to ensure fair resting
      shuffled.sort((a, b) => history.matchesPlayed[a] - history.matchesPlayed[b]);

      const roundMatches: Match[] = [];
      let currentScore = 0;

      for (let m = 0; m < matchesPerRound; m++) {
        const p1 = shuffled[m * 4];
        const p2 = shuffled[m * 4 + 1];
        const p3 = shuffled[m * 4 + 2];
        const p4 = shuffled[m * 4 + 3];

        currentScore += (history.partneredWith[p1][p2] || 0) * 20;
        currentScore += (history.partneredWith[p3][p4] || 0) * 20;
        
        currentScore += (history.playedAgainst[p1][p3] || 0) * 5;
        currentScore += (history.playedAgainst[p1][p4] || 0) * 5;
        currentScore += (history.playedAgainst[p2][p3] || 0) * 5;
        currentScore += (history.playedAgainst[p2][p4] || 0) * 5;

        roundMatches.push({
          id: Math.random().toString(36).slice(2, 9),
          round: roundIndex + 1,
          court: m + 1,
          team1: [p1, p2],
          team2: [p3, p4],
          score1: null,
          score2: null,
          serveFirst: Math.random() > 0.5 ? 1 : 2
        });
      }

      // Calculate score for rested players vs playing players to penalize unfair resting
      if (numPlayers % 4 !== 0) {
          const rested = shuffled.slice(matchesPerRound * 4);
          for(const p of rested) {
             currentScore += history.matchesPlayed[p] * 10;
          }
      }

      if (currentScore < bestScore) {
        bestScore = currentScore;
        bestRound = roundMatches;
        if (currentScore === 0 && (numPlayers % 4 === 0 || roundIndex > 0)) break; 
      }
    }

    // Apply the chosen round to history
    for (const match of bestRound) {
        const [p1, p2] = match.team1;
        const [p3, p4] = match.team2;
        
        history.partneredWith[p1][p2]++;
        history.partneredWith[p2][p1]++;
        history.partneredWith[p3][p4]++;
        history.partneredWith[p4][p3]++;

        const opponents = [[p1, p3], [p1, p4], [p2, p3], [p2, p4]];
        opponents.forEach(([a, b]) => {
            history.playedAgainst[a][b]++;
            history.playedAgainst[b][a]++;
        });

        history.matchesPlayed[p1]++;
        history.matchesPlayed[p2]++;
        history.matchesPlayed[p3]++;
        history.matchesPlayed[p4]++;
    }

    rounds.push(...bestRound);
  }

  return rounds;
}

export interface PlayerStats {
  id: string;
  name: string;
  matchesPlayed: number;
  pointsWon: number;
  pointsDifference: number; // points won - points lost
  wins: number;
}

export function calculateStandings(tournament: Tournament): PlayerStats[] {
  const statsMap: Record<string, PlayerStats> = {};

  for (const player of tournament.players) {
    statsMap[player.id] = {
      id: player.id,
      name: player.name,
      matchesPlayed: 0,
      pointsWon: 0,
      pointsDifference: 0,
      wins: 0,
    };
  }

  for (const match of tournament.matches) {
    if (match.score1 !== null && match.score2 !== null) {
      const isTeam1Win = match.score1 > match.score2;
      const isTeam2Win = match.score2 > match.score1;

      // Update Team 1
      for (const pId of match.team1) {
        if (!statsMap[pId]) continue;
        statsMap[pId].matchesPlayed++;
        statsMap[pId].pointsWon += match.score1;
        statsMap[pId].pointsDifference += (match.score1 - match.score2);
        if (isTeam1Win) statsMap[pId].wins++;
      }

      // Update Team 2
      for (const pId of match.team2) {
        if (!statsMap[pId]) continue;
        statsMap[pId].matchesPlayed++;
        statsMap[pId].pointsWon += match.score2;
        statsMap[pId].pointsDifference += (match.score2 - match.score1);
        if (isTeam2Win) statsMap[pId].wins++;
      }
    }
  }

  return Object.values(statsMap).sort((a, b) => {
    if (b.pointsWon !== a.pointsWon) return b.pointsWon - a.pointsWon;
    if (b.pointsDifference !== a.pointsDifference) return b.pointsDifference - a.pointsDifference;
    return b.wins - a.wins;
  });
}
