/** Deterministic, internally consistent illustrative tournament data.
 * Names are deliberately generic (Squadra 1, Giocatore 9, Campo 1) so the demo never
 * resembles a real team or tournament.
 * No Supabase calls or fabricated live availability; the iPhone is a local demo.
 */
export type TeamId = 't1' | 't2' | 't3' | 't4' | 't5' | 't6';
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
  { id: 't1', name: 'Squadra 1', short: 'S1', color: '#378463', district: 'Città 1',
    coach: 'Mister 1', players: [
      { number: 1, name: 'Giocatore 1', role: 'Portiere' },
      { number: 4, name: 'Giocatore 4', role: 'Difensore' },
      { number: 8, name: 'Giocatore 8', role: 'Centrocampista' },
      { number: 9, name: 'Giocatore 9', role: 'Attaccante' },
    ] },
  { id: 't2', name: 'Squadra 2', short: 'S2', color: '#856dca', district: 'Città 2',
    coach: 'Mister 2', players: [
      { number: 1, name: 'Giocatore 1', role: 'Portiere' },
      { number: 5, name: 'Giocatore 5', role: 'Difensore' },
      { number: 10, name: 'Giocatore 10', role: 'Centrocampista' },
      { number: 11, name: 'Giocatore 11', role: 'Attaccante' },
    ] },
  { id: 't3', name: 'Squadra 3', short: 'S3', color: '#4196a2', district: 'Città 3',
    coach: 'Mister 3', players: [
      { number: 1, name: 'Giocatore 1', role: 'Portiere' },
      { number: 3, name: 'Giocatore 3', role: 'Difensore' },
      { number: 7, name: 'Giocatore 7', role: 'Centrocampista' },
      { number: 9, name: 'Giocatore 9', role: 'Attaccante' },
    ] },
  { id: 't4', name: 'Squadra 4', short: 'S4', color: '#ce7959', district: 'Città 4',
    coach: 'Mister 4', players: [
      { number: 1, name: 'Giocatore 1', role: 'Portiere' },
      { number: 2, name: 'Giocatore 2', role: 'Difensore' },
      { number: 6, name: 'Giocatore 6', role: 'Centrocampista' },
      { number: 9, name: 'Giocatore 9', role: 'Attaccante' },
    ] },
  { id: 't5', name: 'Squadra 5', short: 'S5', color: '#bd9c4e', district: 'Città 5',
    coach: 'Mister 5', players: [
      { number: 1, name: 'Giocatore 1', role: 'Portiere' },
      { number: 4, name: 'Giocatore 4', role: 'Difensore' },
      { number: 8, name: 'Giocatore 8', role: 'Centrocampista' },
      { number: 11, name: 'Giocatore 11', role: 'Attaccante' },
    ] },
  { id: 't6', name: 'Squadra 6', short: 'S6', color: '#b86c88', district: 'Città 6',
    coach: 'Mister 6', players: [
      { number: 1, name: 'Giocatore 1', role: 'Portiere' },
      { number: 3, name: 'Giocatore 3', role: 'Difensore' },
      { number: 6, name: 'Giocatore 6', role: 'Centrocampista' },
      { number: 10, name: 'Giocatore 10', role: 'Attaccante' },
    ] },
];

export const demoMatches: DemoMatch[] = [
  { id: 'm1', round: 1, home: 't1', away: 't6', date: '2026-10-04T17:30', venue: 'Campo 1', score: [2, 0] },
  { id: 'm2', round: 1, home: 't2', away: 't5', date: '2026-10-04T18:30', venue: 'Campo 1', score: [1, 1] },
  { id: 'm3', round: 1, home: 't3', away: 't4', date: '2026-10-04T19:30', venue: 'Campo 1', score: [0, 1] },
  { id: 'm4', round: 2, home: 't1', away: 't5', date: '2026-10-11T17:30', venue: 'Campo 1', score: [2, 1] },
  { id: 'm5', round: 2, home: 't6', away: 't4', date: '2026-10-11T18:30', venue: 'Campo 1', score: [1, 3] },
  { id: 'm6', round: 2, home: 't2', away: 't3', date: '2026-10-11T19:30', venue: 'Campo 1', score: [2, 2] },
  { id: 'm7', round: 3, home: 't1', away: 't4', date: '2026-10-18T17:30', venue: 'Campo 1', score: [3, 1] },
  { id: 'm8', round: 3, home: 't5', away: 't3', date: '2026-10-18T18:30', venue: 'Campo 1', score: [0, 2] },
  { id: 'm9', round: 3, home: 't6', away: 't2', date: '2026-10-18T19:30', venue: 'Campo 1', score: [0, 1] },
  { id: 'm10', round: 4, home: 't1', away: 't3', date: '2026-10-25T17:30', venue: 'Campo 1', score: [2, 2] },
  { id: 'm11', round: 4, home: 't4', away: 't2', date: '2026-10-25T18:30', venue: 'Campo 1', score: [1, 2] },
  { id: 'm12', round: 4, home: 't5', away: 't6', date: '2026-10-25T19:30', venue: 'Campo 1', score: [2, 0] },
  { id: 'm13', round: 5, home: 't1', away: 't2', date: '2026-11-08T17:30', venue: 'Campo 1' },
  { id: 'm14', round: 5, home: 't3', away: 't6', date: '2026-11-08T18:30', venue: 'Campo 1' },
  { id: 'm15', round: 5, home: 't4', away: 't5', date: '2026-11-08T19:30', venue: 'Campo 1' },
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
