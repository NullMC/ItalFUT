/** Deterministic, internally consistent illustrative tournament data.
 * No Supabase calls or fabricated live availability; the iPhone is a local demo.
 */
export type TeamId = 'bari' | 'atletico' | 'levante' | 'real' | 'nord' | 'stella';
export type DemoPlayer = { number: number; name: string; role: string };
export type DemoTeam = {
  id: TeamId; name: string; short: string; color: string; district: string;
  coach: string; players: DemoPlayer[];
};
export type DemoMatch = {
  id: string; round: number; home: TeamId; away: TeamId; date: string;
  venue: string; score?: readonly [number, number];
};
export type TeamStats = {
  id: TeamId; played: number; won: number; drawn: number; lost: number;
  gf: number; ga: number; gd: number; points: number;
};

export const demoTeams: DemoTeam[] = [
  { id: 'bari', name: 'Bari FC', short: 'BFC', color: '#378463', district: 'Bari',
    coach: 'M. De Santis', players: [
      { number: 1, name: 'D. Rizzo', role: 'Portiere' },
      { number: 4, name: 'L. Moretti', role: 'Difensore' },
      { number: 8, name: 'A. Marino', role: 'Centrocampista' },
      { number: 9, name: 'F. Greco', role: 'Attaccante' },
    ] },
  { id: 'atletico', name: 'Atletico', short: 'ATL', color: '#856dca', district: 'Molfetta',
    coach: 'A. Caputo', players: [
      { number: 1, name: 'P. Leone', role: 'Portiere' },
      { number: 5, name: 'F. Testa', role: 'Difensore' },
      { number: 10, name: 'N. Basile', role: 'Centrocampista' },
      { number: 11, name: 'G. Lorusso', role: 'Attaccante' },
    ] },
  { id: 'levante', name: 'Levante', short: 'LEV', color: '#4196a2', district: 'Trani',
    coach: 'G. Russo', players: [
      { number: 1, name: 'E. Fiore', role: 'Portiere' },
      { number: 3, name: 'S. Gallo', role: 'Difensore' },
      { number: 7, name: 'M. Gentile', role: 'Centrocampista' },
      { number: 9, name: 'V. Masi', role: 'Attaccante' },
    ] },
  { id: 'real', name: 'Real Sud', short: 'RSD', color: '#ce7959', district: 'Monopoli',
    coach: 'M. Ferrara', players: [
      { number: 1, name: 'D. Longo', role: 'Portiere' },
      { number: 2, name: 'C. Bianco', role: 'Difensore' },
      { number: 6, name: 'L. Ricci', role: 'Centrocampista' },
      { number: 9, name: 'R. Esposito', role: 'Attaccante' },
    ] },
  { id: 'nord', name: 'Nord United', short: 'NRD', color: '#bd9c4e', district: 'Bitonto',
    coach: 'S. Parisi', players: [
      { number: 1, name: 'A. Caruso', role: 'Portiere' },
      { number: 4, name: 'N. Resta', role: 'Difensore' },
      { number: 8, name: 'P. Romanelli', role: 'Centrocampista' },
      { number: 11, name: 'T. Sala', role: 'Attaccante' },
    ] },
  { id: 'stella', name: 'Stella 06', short: 'STL', color: '#b86c88', district: 'Modugno',
    coach: 'L. Vitale', players: [
      { number: 1, name: 'V. Fabbri', role: 'Portiere' },
      { number: 3, name: 'C. Orlando', role: 'Difensore' },
      { number: 6, name: 'L. Neri', role: 'Centrocampista' },
      { number: 10, name: 'F. Colonna', role: 'Attaccante' },
    ] },
];

export const demoMatches: DemoMatch[] = [
  { id: 'm1', round: 1, home: 'bari', away: 'stella', date: '2026-10-04T17:30', venue: 'Campo Sportivo Nord', score: [2, 0] },
  { id: 'm2', round: 1, home: 'atletico', away: 'nord', date: '2026-10-04T18:30', venue: 'Campo Sportivo Nord', score: [1, 1] },
  { id: 'm3', round: 1, home: 'levante', away: 'real', date: '2026-10-04T19:30', venue: 'Campo Sportivo Nord', score: [0, 1] },
  { id: 'm4', round: 2, home: 'bari', away: 'nord', date: '2026-10-11T17:30', venue: 'Campo Sportivo Nord', score: [2, 1] },
  { id: 'm5', round: 2, home: 'stella', away: 'real', date: '2026-10-11T18:30', venue: 'Campo Sportivo Nord', score: [1, 3] },
  { id: 'm6', round: 2, home: 'atletico', away: 'levante', date: '2026-10-11T19:30', venue: 'Campo Sportivo Nord', score: [2, 2] },
  { id: 'm7', round: 3, home: 'bari', away: 'real', date: '2026-10-18T17:30', venue: 'Campo Sportivo Nord', score: [3, 1] },
  { id: 'm8', round: 3, home: 'nord', away: 'levante', date: '2026-10-18T18:30', venue: 'Campo Sportivo Nord', score: [0, 2] },
  { id: 'm9', round: 3, home: 'stella', away: 'atletico', date: '2026-10-18T19:30', venue: 'Campo Sportivo Nord', score: [0, 1] },
  { id: 'm10', round: 4, home: 'bari', away: 'levante', date: '2026-10-25T17:30', venue: 'Campo Sportivo Nord', score: [2, 2] },
  { id: 'm11', round: 4, home: 'real', away: 'atletico', date: '2026-10-25T18:30', venue: 'Campo Sportivo Nord', score: [1, 2] },
  { id: 'm12', round: 4, home: 'nord', away: 'stella', date: '2026-10-25T19:30', venue: 'Campo Sportivo Nord', score: [2, 0] },
  { id: 'm13', round: 5, home: 'bari', away: 'atletico', date: '2026-11-08T17:30', venue: 'Campo Sportivo Nord' },
  { id: 'm14', round: 5, home: 'levante', away: 'stella', date: '2026-11-08T18:30', venue: 'Campo Sportivo Nord' },
  { id: 'm15', round: 5, home: 'real', away: 'nord', date: '2026-11-08T19:30', venue: 'Campo Sportivo Nord' },
];

export const teamById = (id: TeamId): DemoTeam =>
  demoTeams.find(t => t.id === id)!;

export const matchDate = (date: string): string =>
  new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(date));

export const matchTime = (date: string): string =>
  new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));

export const standings: TeamStats[] = (() => {
  const byId = {} as Record<TeamId, TeamStats>;
  for (const team of demoTeams) {
    byId[team.id] = { id: team.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
  }
  for (const match of demoMatches) {
    if (!match.score) continue;
    const [h, a] = match.score;
    const home = byId[match.home], away = byId[match.away];
    home.played++; away.played++;
    home.gf += h; home.ga += a; away.gf += a; away.ga += h;
    if (h > a) { home.won++; away.lost++; home.points += 3; }
    else if (h < a) { away.won++; home.lost++; away.points += 3; }
    else { home.drawn++; away.drawn++; home.points++; away.points++; }
  }
  return Object.values(byId).map(row => ({ ...row, gd: row.gf - row.ga }))
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || teamById(a.id).name.localeCompare(teamById(b.id).name));
})();

export type DemoGoal = { minute: number; team: TeamId; player: DemoPlayer };
export function goalEvents(match: DemoMatch): DemoGoal[] {
  if (!match.score) return [];
  const events: DemoGoal[] = [];
  const goalMinutes = [12, 24, 37, 53, 67, 81, 88];
  let index = 0;
  for (const [id, count] of [[match.home, match.score[0]], [match.away, match.score[1]]] as [TeamId, number][]) {
    const scoringPlayers = teamById(id).players.slice(2);
    for (let i = 0; i < count; i++) {
      events.push({ minute: goalMinutes[index % goalMinutes.length],
        team: id, player: scoringPlayers[i % scoringPlayers.length] });
      index++;
    }
  }
  return events.sort((a, b) => a.minute - b.minute);
}

export function goalsForPlayer(teamId: TeamId, number: number): number {
  return demoMatches.reduce((sum, match) =>
    sum + goalEvents(match).filter(goal => goal.team === teamId && goal.player.number === number).length, 0);
}
