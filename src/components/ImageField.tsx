import { useId, useRef, useState, type DragEvent } from 'react';
import { CircularProgress, TextField } from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { MEDIA_ACCEPT, uploadTenantImage, type MediaKind } from '../lib/media';
import { safeUrl } from '../lib/validation';

type Props = {
  label: string; value: string; onChange: (url: string) => void;
  tenantId: string; field: string; kind: MediaKind;
  disabled?: boolean; required?: boolean;
  /** Called with every URL uploaded here, so the parent can clean up unsaved files. */
  onUploaded?: (url: string) => void;
};

const HINT: Record<MediaKind, string> = {
  logo: 'quadrato, almeno 256 px',
  photo: 'verticale o quadrata',
  cover: 'orizzontale, almeno 1600 px',
  image: 'orizzontale consigliata',
};

/**
 * Image input for tournament content: upload from the computer (drag & drop or file
 * picker, converted to WebP in the browser) or paste a link. Both end up as an https URL.
 */
export function ImageField({ label, value, onChange, tenantId, field, kind, disabled, required, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [over, setOver] = useState(false);
  const [broken, setBroken] = useState(false);
  const preview = safeUrl(value);

  const upload = async (file: File | undefined) => {
    if (!file || disabled || busy) return;
    setError(''); setBusy(true);
    try {
      const url = await uploadTenantImage(tenantId, field, file, kind);
      onUploaded?.(url);
      setBroken(false);
      onChange(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Caricamento non riuscito. Riprova.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); setOver(false);
    void upload(event.dataTransfer.files?.[0]);
  };

  return <div className={'image-field' + (disabled ? ' is-disabled' : '')} role="group" aria-labelledby={id + '-label'}>
    <span className="image-field__label" id={id + '-label'}>{label}{required ? ' *' : ''}</span>
    <div className={'image-field__drop' + (over ? ' is-over' : '') + (error ? ' has-error' : '')}
      onDragOver={event => { event.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)} onDrop={onDrop}>
      <span className={'image-field__preview image-field__preview--' + kind} aria-hidden={!preview || broken}>
        {busy ? <CircularProgress size={22} aria-label="Caricamento in corso" />
          : preview && !broken ? <img src={preview} alt={'Anteprima: ' + label} referrerPolicy="no-referrer" onError={() => setBroken(true)} onLoad={() => setBroken(false)} />
          : <ImageRoundedIcon />}
      </span>
      <div className="image-field__body">
        <button type="button" className="image-field__pick" onClick={() => inputRef.current?.click()} disabled={disabled || busy}>
          <CloudUploadRoundedIcon fontSize="small" />{busy ? 'Caricamento…' : value ? 'Sostituisci dal computer' : 'Carica dal computer'}
        </button>
        <small>oppure trascina qui il file · WebP, PNG, JPG o AVIF · salvata come .webp, {HINT[kind]}</small>
        {broken && preview && <small className="image-field__warn">Anteprima non disponibile: controlla che il link punti a un’immagine.</small>}
        {error && <small className="image-field__error" role="alert">{error}</small>}
      </div>
      {value && !busy && <button type="button" className="image-field__remove" onClick={() => { onChange(''); setError(''); }} disabled={disabled}
        aria-label={'Rimuovi ' + label.toLowerCase()} title="Rimuovi"><DeleteOutlineRoundedIcon fontSize="small" /></button>}
      <input ref={inputRef} type="file" accept={MEDIA_ACCEPT} hidden tabIndex={-1} aria-hidden="true"
        onChange={event => void upload(event.target.files?.[0])} />
    </div>
    <TextField size="small" fullWidth label="oppure incolla un link (https://…)" type="url" value={value} disabled={disabled || busy}
      onChange={event => { setBroken(false); onChange(event.target.value); }}
      slotProps={{ htmlInput: { maxLength: 2048, 'aria-describedby': id + '-label' } }} />
  </div>;
}
