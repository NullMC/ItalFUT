-- Add optional, human-authored image descriptions for screen readers.
-- Existing images keep contextual fallback texts until editors provide better alt text.
alter table public.articles add column if not exists image_alt text;
alter table public.sponsors add column if not exists image_alt text;
comment on column public.articles.image_alt is 'Editor-provided concise description of article image for assistive technology.';
comment on column public.sponsors.image_alt is 'Editor-provided descriptive alternative of sponsor activity photo.';
