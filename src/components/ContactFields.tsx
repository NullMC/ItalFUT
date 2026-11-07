/** Name, email and phone of an organizer (sign-up, account page, tournament creation). */
import { Stack, TextField } from '@mui/material';
import type { Contact } from '../lib/contact';

type Props = {
  value: Contact; onChange: (next: Contact) => void; errors?: Partial<Record<keyof Contact, string>>;
  required?: boolean; disabled?: boolean; idPrefix?: string;
};

export function ContactFields({ value, onChange, errors = {}, required = false, disabled = false, idPrefix = 'contact' }: Props) {
  const set = (key: keyof Contact) => (event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [key]: event.target.value });
  return <Stack spacing={2}>
    <TextField id={idPrefix + '-name'} label="Nome e cognome" value={value.full_name} onChange={set('full_name')} required={required} disabled={disabled}
      autoComplete="name" error={Boolean(errors.full_name)} helperText={errors.full_name || undefined} slotProps={{ htmlInput: { maxLength: 120 } }} />
    <div className="contact-fields__row">
      <TextField id={idPrefix + '-email'} label="Email" type="email" value={value.email} onChange={set('email')} required={required} disabled={disabled}
        autoComplete="email" error={Boolean(errors.email)} helperText={errors.email || undefined} slotProps={{ htmlInput: { maxLength: 254, autoCapitalize: 'none', spellCheck: false } }} />
      <TextField id={idPrefix + '-phone'} label="Telefono" type="tel" value={value.phone} onChange={set('phone')} required={required} disabled={disabled}
        autoComplete="tel" placeholder="+39 333 1234567" error={Boolean(errors.phone)} helperText={errors.phone || undefined} slotProps={{ htmlInput: { maxLength: 24, inputMode: 'tel' } }} />
    </div>
  </Stack>;
}
