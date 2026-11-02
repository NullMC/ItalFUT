import { useEffect, useState } from 'react';
import { client, friendlyError } from './supabase';

export type StatMatch = {
  id: string; status: string; kickoff_at: string | null; venue: string | null; matchday: string | null;
  home_team_id: string | null; away_team_id: string | null; home_score: number | null; away_score: number | null;
};
export type TenantStats = {
  teams: { id: string; name: string; accent_hex: string | null }[];
  players: number; competitions: number; matches: StatMatch[];
};

/* One request per tournament shared by the sidebar, the overview and the charts.
   Editors call invalidateTenantStats() after a change. */
const cache = new Map<string, Promise<TenantStats>>();
const listeners = new Map<string, Set<() => void>>();

async function fetchStats(tenantId: string): Promise<TenantStats> {
  const sb = client();
  const [teams, players, competitions] = await Promise.all([
    sb.from('teams').select('id,name,accent_hex').eq('tenant_id', tenantId).limit(1000),
    sb.from('players').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    sb.from('competitions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
  ]);
  const issue = [teams, players, competitions].find(result => result.error)?.error;
  if (issue) throw issue;
  const matches: StatMatch[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await sb.from('matches').select('id,status,kickoff_at,venue,matchday,home_team_id,away_team_id,home_score,away_score')
      .eq('tenant_id', tenantId).order('kickoff_at', { ascending: true }).range(offset, offset + 999);
    if (page.error) throw page.error;
    matches.push(...((page.data ?? []) as StatMatch[]));
    if ((page.data ?? []).length < 1000) break;
  }
  return {
    teams: (teams.data ?? []) as TenantStats['teams'], players: players.count ?? 0,
    competitions: competitions.count ?? 0, matches,
  };
}

export function invalidateTenantStats(tenantId: string) {
  cache.delete(tenantId);
  listeners.get(tenantId)?.forEach(listener => listener());
}

export function useTenantStats(tenantId: string | undefined) {
  const [state, setState] = useState<{ data: TenantStats | null; error: string }>({ data: null, error: '' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!tenantId) return;
    const set = listeners.get(tenantId) ?? new Set();
    const bump = () => setVersion(v => v + 1);
    set.add(bump); listeners.set(tenantId, set);
    return () => { set.delete(bump); };
  }, [tenantId]);
  useEffect(() => {
    if (!tenantId) return;
    let live = true;
    if (!cache.has(tenantId)) cache.set(tenantId, fetchStats(tenantId));
    cache.get(tenantId)!.then(
      data => { if (live) setState({ data, error: '' }); },
      cause => { cache.delete(tenantId); if (live) setState({ data: null, error: friendlyError(cause) }); },
    );
    return () => { live = false; };
  }, [tenantId, version]);
  return state;
}

/** Shared derived numbers. */
export function summarize(stats: TenantStats) {
  const now = Date.now();
  const by = (status: string) => stats.matches.filter(match => match.status === status).length;
  const upcoming = stats.matches
    .filter(match => match.status === 'scheduled' && match.kickoff_at && new Date(match.kickoff_at).getTime() >= now - 3 * 3_600_000)
    .sort((a, b) => new Date(a.kickoff_at!).getTime() - new Date(b.kickoff_at!).getTime());
  const unscheduled = stats.matches.filter(match => match.status === 'scheduled' && !match.kickoff_at).length;
  const recent = stats.matches.filter(match => match.status === 'finished')
    .sort((a, b) => new Date(b.kickoff_at ?? 0).getTime() - new Date(a.kickoff_at ?? 0).getTime());
  return { finished: by('finished'), live: by('live'), scheduled: by('scheduled'), postponed: by('postponed'), total: stats.matches.length, upcoming, recent, unscheduled };
}
