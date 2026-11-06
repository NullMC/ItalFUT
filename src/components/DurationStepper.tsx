/*
 * Custom plan duration: any whole number of months between MIN_MONTHS and MAX_MONTHS.
 * Shown under the 1/3/6/12 presets; when the value matches a preset, that preset lights up.
 */
import { useEffect, useId, useState } from 'react';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { discountFor, MAX_MONTHS, MIN_MONTHS, TERMS } from '../lib/catalog';

type Props = { months: number; onChange: (months: number) => void; disabled?: boolean; className?: string };

export function DurationStepper({ months, onChange, disabled, className }: Props) {
  const id = useId();
  const [text, setText] = useState(String(months));
  useEffect(() => { setText(String(months)); }, [months]);
  const set = (value: number) => onChange(Math.min(MAX_MONTHS, Math.max(MIN_MONTHS, value)));
  const discount = discountFor(months);
  const custom = !TERMS.some(term => term.months === months);

  return <div className={'duration-custom' + (custom ? ' is-custom' : '') + (className ? ' ' + className : '')}>
    <div className="duration-custom__text">
      <label htmlFor={id}>Durata personalizzata</label>
      <small id={id + '-hint'}>Da {MIN_MONTHS} a {MAX_MONTHS} mesi · {discount ? `sconto −${Math.round(discount * 100)}%` : 'tariffa base'} · sconti da 3, 6 e 12 mesi</small>
    </div>
    <div className="stepper" role="group" aria-label="Numero di mesi">
      <button type="button" className="stepper__btn" aria-label="Un mese in meno" disabled={disabled || months <= MIN_MONTHS} onClick={() => set(months - 1)}><RemoveRoundedIcon fontSize="small" /></button>
      <input id={id} type="number" inputMode="numeric" min={MIN_MONTHS} max={MAX_MONTHS} step={1} value={text} disabled={disabled}
        aria-describedby={id + '-hint'}
        onChange={event => {
          setText(event.target.value);
          const value = Number(event.target.value);
          if (Number.isInteger(value) && value >= MIN_MONTHS && value <= MAX_MONTHS) onChange(value);
        }}
        onBlur={() => setText(String(months))} />
      <span className="stepper__unit" aria-hidden="true">{months === 1 ? 'mese' : 'mesi'}</span>
      <button type="button" className="stepper__btn" aria-label="Un mese in più" disabled={disabled || months >= MAX_MONTHS} onClick={() => set(months + 1)}><AddRoundedIcon fontSize="small" /></button>
    </div>
  </div>;
}
