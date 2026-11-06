/*
 * Tournament images uploaded from the organizer's computer.
 * The browser decodes the picture, resizes it and re-encodes it as WebP, so the
 * bucket only ever receives small .webp files (see 202611060001_tenant_media.sql).
 */
import { client } from './supabase';

export const MEDIA_BUCKET = 'tenant-media';
export const MEDIA_MAX_BYTES = 2 * 1024 * 1024;
/** What the file picker offers. Everything is stored as WebP. */
export const MEDIA_ACCEPT = 'image/webp,image/png,image/jpeg,image/avif,.webp,.png,.jpg,.jpeg,.avif';
const DECODABLE = ['image/webp', 'image/png', 'image/jpeg', 'image/avif'];
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

export type MediaKind = 'logo' | 'photo' | 'cover' | 'image';
const PRESET: Record<MediaKind, { side: number; quality: number }> = {
  logo: { side: 512, quality: .9 },
  photo: { side: 800, quality: .85 },
  cover: { side: 2000, quality: .82 },
  image: { side: 1600, quality: .82 },
};

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
}

/** Resized WebP version of the picture, or a clear error in Italian. */
export async function toWebp(file: File, kind: MediaKind): Promise<Blob> {
  const type = file.type || (/\.webp$/i.test(file.name) ? 'image/webp' : '');
  if (!DECODABLE.includes(type)) throw new Error('Formato non supportato: carica un’immagine WebP, PNG, JPG o AVIF.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('File troppo grande: scegli un’immagine sotto i 20 MB.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error('Impossibile leggere l’immagine: il file potrebbe essere danneggiato.'); }
  const { side, quality } = PRESET[kind];
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Il browser non riesce a elaborare l’immagine.');
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let blob = await canvasToBlob(canvas, quality);
  // A lower quality pass keeps large photos under the limit.
  if (blob?.type === 'image/webp' && blob.size > MEDIA_MAX_BYTES) blob = await canvasToBlob(canvas, .7);
  if (!blob || blob.type !== 'image/webp') {
    // Browsers that cannot encode WebP (older Safari): an original .webp is still fine.
    if (type === 'image/webp' && file.size <= MEDIA_MAX_BYTES) return file;
    throw new Error('Questo browser non converte in WebP: carica direttamente un file .webp (max 2 MB) o usa Chrome, Edge o Firefox.');
  }
  if (blob.size > MEDIA_MAX_BYTES) throw new Error('Immagine troppo pesante anche dopo la compressione: prova con una foto più piccola.');
  return blob;
}

/** Converts and uploads; returns the public https URL to store in the record. */
export async function uploadTenantImage(tenantId: string, field: string, file: File, kind: MediaKind): Promise<string> {
  const webp = await toWebp(file, kind);
  const folder = field.toLowerCase().replace(/[^a-z_]/g, '_').slice(0, 40) || 'image';
  const path = `${tenantId}/${folder}/${crypto.randomUUID()}.webp`;
  const storage = client().storage.from(MEDIA_BUCKET);
  const { error } = await storage.upload(path, webp, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
  if (error) {
    const text = error.message.toLowerCase();
    if (text.includes('bucket not found')) throw new Error('Caricamento non ancora configurato: esegui la migrazione 202611060001_tenant_media.sql.');
    if (text.includes('row-level security') || text.includes('unauthorized')) throw new Error('Non hai i permessi per caricare immagini in questo torneo.');
    if (text.includes('exceeded') || text.includes('too large')) throw new Error('Immagine troppo pesante (max 2 MB).');
    throw new Error('Caricamento non riuscito. Riprova.');
  }
  return storage.getPublicUrl(path).data.publicUrl;
}

/** Storage path of an image uploaded here, or null for external links. */
export function mediaPath(url: unknown): string | null {
  if (typeof url !== 'string' || !url) return null;
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return null;
  const path = decodeURIComponent(url.slice(index + marker.length).split('?')[0]);
  return /^[0-9a-f-]{36}\/[a-z_]{1,40}\/[0-9a-f-]{36}\.webp$/.test(path) ? path : null;
}

/** Deletes uploaded files that are no longer referenced. Best effort: never throws. */
export async function removeMedia(urls: unknown[]) {
  const paths = [...new Set(urls.map(mediaPath).filter((p): p is string => Boolean(p)))];
  if (!paths.length) return;
  try { await client().storage.from(MEDIA_BUCKET).remove(paths); } catch { /* orphan files are harmless */ }
}

/** Deletes every file of a tournament (before deleting the tournament itself). */
export async function removeTenantMedia(tenantId: string) {
  try {
    const storage = client().storage.from(MEDIA_BUCKET);
    const { data: folders } = await storage.list(tenantId, { limit: 100 });
    const paths: string[] = [];
    for (const folder of folders ?? []) {
      for (let offset = 0; ; offset += 1000) {
        const { data: files } = await storage.list(`${tenantId}/${folder.name}`, { limit: 1000, offset });
        paths.push(...(files ?? []).map(file => `${tenantId}/${folder.name}/${file.name}`));
        if ((files ?? []).length < 1000) break;
      }
    }
    for (let i = 0; i < paths.length; i += 500) await storage.remove(paths.slice(i, i + 500));
  } catch { /* best effort */ }
}
