/*
 * Tournament formats.
 * - event: one-day tournament (e.g. 12 hours). Core platform free; extras cost their 1-month
 *   price once. Published from the event day; 48 h to update results, then the console closes
 *   and the public site stays online until the tournament is deleted.
 * - season: longer competitions, paid per period (1–24 months).
 * The rules are enforced in the database (migration 202611090001); this file only mirrors them.
 */
import { EXTRA, validMonths } from './catalog';
import type { FeatureCode, Tenant } from './types';

export type PlanKind = 'event' | 'season';
export type PlanDraft = { kind: PlanKind; months: number; modules: FeatureCode[]; eventDate: string };
export const EDIT_WINDOW_HOURS = 48;
const KEY = 'italfut_configuration';
const TZ = 'Europe/Rome';

/** Today in Italy as YYYY-MM-DD (the same day the database uses). */
export function romeToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function addDays(iso: string, days: number) {
  const date = new Date(iso + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export function validEventDate(iso: string) {
  return ISO_DATE.test(iso) && iso >= romeToday() && iso <= addDays(romeToday(), 730);
}
export function formatDay(iso: string | null | undefined, long = true) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('it-IT', { timeZone: 'UTC', weekday: long ? 'long' : undefined, day: 'numeric', month: long ? 'long' : 'short', year: 'numeric' })
    .format(new Date(iso + 'T12:00:00Z'));
}
export function formatMoment(value: string | Date) {
  return new Intl.DateTimeFormat('it-IT', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

/** One-off price of the extras of a one-day tournament (1-month price each). */
export function eventTotal(modules: FeatureCode[]) {
  return EXTRA.filter(m => modules.includes(m.code)).reduce((sum, m) => sum + m.monthly, 0);
}

export function readDraft(): PlanDraft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (!value) return null;
    return {
      kind: value.kind === 'season' ? 'season' : 'event',
      months: validMonths(Number(value.months)) ? Number(value.months) : 1,
      modules: (Array.isArray(value.modules) ? value.modules : []).filter((code: unknown): code is FeatureCode => EXTRA.some(m => m.code === code)),
      eventDate: typeof value.eventDate === 'string' && validEventDate(value.eventDate) ? value.eventDate : '',
    };
  } catch { return null; }
}
export function writeDraft(draft: PlanDraft) {
  try { sessionStorage.setItem(KEY, JSON.stringify(draft)); } catch { /* storage unavailable */ }
}
export function clearDraft() {
  try { sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}

export type EventPhase = 'upcoming' | 'today' | 'open' | 'closed';
/** Where a one-day tournament stands, and until when it can be edited. */
export function eventPhase(tenant: Pick<Tenant, 'event_date' | 'published_at'>, now = new Date()): { phase: EventPhase; closesAt: Date | null } {
  if (tenant.published_at) {
    const closesAt = new Date(new Date(tenant.published_at).getTime() + EDIT_WINDOW_HOURS * 3600_000);
    return { phase: now < closesAt ? 'open' : 'closed', closesAt };
  }
  return { phase: tenant.event_date && tenant.event_date <= romeToday(now) ? 'today' : 'upcoming', closesAt: null };
}
