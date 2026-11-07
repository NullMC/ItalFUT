/*
 * Organizer contact details (full name, email, phone). Optional at sign-up, required to
 * create a tournament or pay a plan. Visible only to the user and to the superadmin; used
 * only to reach the organizer for support. No email is ever sent.
 * The database (migration 202611110001) validates and normalises the same way.
 */
import { client } from './supabase';

export type Contact = { full_name: string; email: string; phone: string };
export const EMPTY_CONTACT: Contact = { full_name: '', email: '', phone: '' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function normalizePhone(value: string) {
  let phone = value.trim().replace(/[^0-9+]/g, '');
  if (phone.startsWith('00')) phone = '+' + phone.slice(2);
  return phone;
}
/** Field errors ('' when valid). Empty fields are valid unless `required`. */
export function contactErrors(contact: Contact, required = false) {
  const name = contact.full_name.trim().replace(/\s+/g, ' ');
  const email = contact.email.trim();
  const phone = normalizePhone(contact.phone);
  return {
    full_name: !name ? (required ? 'Inserisci nome e cognome.' : '') : name.length < 2 || name.length > 120 ? 'Da 2 a 120 caratteri.' : '',
    email: !email ? (required ? 'Inserisci un indirizzo email.' : '') : email.length > 254 || !EMAIL.test(email) ? 'Indirizzo email non valido.' : '',
    phone: !phone ? (required ? 'Inserisci un numero di telefono.' : '') : !/^\+?[0-9]{6,15}$/.test(phone) ? 'Solo cifre, con il prefisso se serve (es. +39 333 1234567).' : '',
  };
}
export const hasErrors = (errors: Record<string, string>) => Object.values(errors).some(Boolean);
export const isComplete = (contact: Contact | null) => Boolean(contact && contact.full_name.trim() && contact.email.trim() && contact.phone.trim());
export const isEmpty = (contact: Contact) => !contact.full_name.trim() && !contact.email.trim() && !contact.phone.trim();

export async function loadMyContact(userId: string): Promise<Contact | null> {
  const { data, error } = await client().from('organizer_contacts').select('full_name,email,phone').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { full_name: data.full_name ?? '', email: data.email ?? '', phone: data.phone ?? '' };
}
export async function saveMyContact(contact: Contact): Promise<Contact> {
  const { data, error } = await client().rpc('save_my_contact', { p_full_name: contact.full_name, p_email: contact.email, p_phone: contact.phone });
  if (error) throw error;
  const saved = data as { full_name: string | null; email: string | null; phone: string | null };
  return { full_name: saved.full_name ?? '', email: saved.email ?? '', phone: saved.phone ?? '' };
}
/** True when a database error is the "contact details missing" check. */
export const isContactRequired = (error: unknown) => (error as { hint?: string } | null)?.hint === 'contact_required';
