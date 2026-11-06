/*
 * Return page from Stripe Checkout (success_url). The plan is activated by the webhook,
 * so this page only reads the payment row and waits briefly until Stripe confirms it.
 */
import { useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { client } from '../lib/supabase';
import { formatEuro } from '../lib/catalog';
import type { Payment } from '../lib/payments';

type Row = Pick<Payment, 'status' | 'months' | 'amount_cents' | 'amount_paid_cents' | 'period_end'> & { tenants: { slug: string; name: string } | null };
const date = (value: string | null) => value ? new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value)) : '';
const SESSION = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;
const POLLS = 15;

export function PaymentResult() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id') ?? '';
  const valid = SESSION.test(sessionId);
  const [row, setRow] = useState<Row | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>(valid ? 'loading' : 'missing');
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!valid) return;
    let live = true;
    const load = async () => {
      const { data } = await client().from('payments').select('status,months,amount_cents,amount_paid_cents,period_end,tenants(slug,name)').eq('stripe_session_id', sessionId).maybeSingle();
      if (!live) return;
      if (!data) { setState(tries + 1 >= POLLS ? 'missing' : 'loading'); }
      else { setRow(data as unknown as Row); setState('ready'); }
    };
    void load();
    return () => { live = false; };
  }, [sessionId, valid, tries]);

  // Webhooks usually arrive in a few seconds: poll while the payment is still pending.
  const waiting = state === 'loading' || row?.status === 'pending';
  useEffect(() => {
    if (!valid || !waiting || tries >= POLLS) return;
    const timer = window.setTimeout(() => setTries(n => n + 1), 2000);
    return () => window.clearTimeout(timer);
  }, [valid, waiting, tries]);

  const consoleLink = row?.tenants ? `/console/${row.tenants.slug}` : '/console';
  let icon = <HourglassTopRoundedIcon />, tone = 'pending', title = 'Stiamo confermando il pagamento…', text = 'Stripe sta comunicando l’esito. Di solito servono pochi secondi.';
  if (state === 'missing') {
    icon = <ErrorOutlineRoundedIcon />; tone = 'failed'; title = 'Pagamento non trovato';
    text = 'Non troviamo un pagamento collegato a questo link. Se hai pagato, controlla lo stato nella sezione Moduli del torneo o scrivici dai contatti.';
  } else if (row?.status === 'paid') {
    icon = <CheckCircleRoundedIcon />; tone = 'paid'; title = 'Pagamento completato';
    text = `Grazie! ${row.tenants?.name ?? 'Il torneo'} è attivo fino al ${date(row.period_end)}. Hai pagato ${formatEuro((row.amount_paid_cents ?? row.amount_cents) / 100)}; la ricevuta arriva da Stripe.`;
  } else if (row?.status === 'pending' && tries >= POLLS) {
    title = 'Pagamento in elaborazione';
    text = 'Alcuni metodi di pagamento richiedono più tempo. Il piano si attiva da solo appena Stripe conferma: puoi chiudere questa pagina.';
  } else if (row && ['failed', 'expired', 'refunded'].includes(row.status)) {
    icon = <ErrorOutlineRoundedIcon />; tone = 'failed';
    title = row.status === 'refunded' ? 'Pagamento rimborsato' : 'Pagamento non riuscito';
    text = row.status === 'refunded' ? 'Questo pagamento è stato rimborsato.' : 'Il pagamento non è andato a buon fine e non è stato addebitato nulla. Puoi riprovare dalla sezione Moduli.';
  }

  return <div className="page payment-result">
    <div className={'payment-result__card glass is-' + tone} role="status" aria-live="polite">
      <span className="payment-result__icon" aria-hidden="true">{waiting && tries < POLLS ? <CircularProgress size={34} color="inherit" /> : icon}</span>
      <h1>{title}</h1>
      <p>{text}</p>
      <div className="payment-result__actions">
        <RouterLink className="btn btn--primary" to={row?.tenants ? consoleLink + '/modules' : '/console'}>{row?.status === 'paid' ? 'Vai al piano' : 'Torna alla console'}</RouterLink>
        {row?.status === 'paid' && row.tenants && <a className="btn btn--ghost glass" href={'/t/' + row.tenants.slug} target="_blank" rel="noopener noreferrer">Apri il sito</a>}
      </div>
    </div>
  </div>;
}
