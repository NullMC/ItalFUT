import { useEffect, useState, type ReactNode } from 'react';
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { Football3D } from '../components/fx/Football3D';
import { GlowField } from '../components/fx/Backdrop';

export type ErrorCode = '400' | '401' | '403' | '404' | '429' | '500' | '503' | 'offline';

type Copy = { title: string; accent: string; text: string; tag: string };
/** Football metaphors keep errors human; the text always says what happened and what to do. */
const COPY: Record<ErrorCode, Copy> = {
  '400': { tag: 'Richiesta non valida', title: 'Fallo di mano.', accent: 'Qualcosa non torna.', text: 'La richiesta contiene dati non validi o incompleti. Torna indietro, controlla i campi e riprova.' },
  '401': { tag: 'Accesso richiesto', title: 'Serve il pass', accent: 'per entrare in campo.', text: 'Questa pagina è riservata agli organizzatori. Accedi con username e password per continuare.' },
  '403': { tag: 'Accesso negato', title: 'Cartellino rosso.', accent: 'Qui non puoi entrare.', text: 'Il tuo account non ha i permessi per questa pagina o questo torneo. Se pensi sia un errore, contatta il proprietario del torneo o scrivici.' },
  '404': { tag: 'Pagina non trovata', title: 'Fuorigioco.', accent: 'Questa pagina non esiste.', text: 'L’indirizzo potrebbe essere sbagliato, oppure la pagina è stata spostata o eliminata. Il torneo che cerchi potrebbe non essere ancora pubblico.' },
  '429': { tag: 'Troppi tentativi', title: 'Time-out.', accent: 'Riprendi fiato.', text: 'Ci sono stati troppi tentativi in poco tempo. Per proteggere l’account l’accesso è sospeso per qualche istante.' },
  '500': { tag: 'Errore imprevisto', title: 'Partita sospesa.', accent: 'Qualcosa è andato storto.', text: 'Si è verificato un errore inatteso. Ricarica la pagina; se il problema continua, segnalacelo dalla pagina Contatti.' },
  '503': { tag: 'Servizio non disponibile', title: 'Campo impraticabile.', accent: 'Torniamo presto.', text: 'Il servizio non è raggiungibile in questo momento. Riprova tra qualche minuto.' },
  offline: { tag: 'Sei offline', title: 'Fuori dal campo.', accent: 'Nessuna connessione.', text: 'Il dispositivo non è connesso a internet. Controlla la rete e riprova.' },
};
const KNOWN = Object.keys(COPY) as ErrorCode[];

export function ErrorView({ code, detail, retry, waitSeconds, compact = false }: {
  code: ErrorCode; detail?: ReactNode; retry?: () => void; waitSeconds?: number; compact?: boolean;
}) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const copy = COPY[code] ?? COPY['500'];
  const [left, setLeft] = useState(waitSeconds ?? 0);
  useEffect(() => { setLeft(waitSeconds ?? 0); }, [waitSeconds]);
  useEffect(() => {
    if (left <= 0) return;
    const timer = window.setTimeout(() => setLeft(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [left]);
  useEffect(() => { document.title = copy.tag + ' · ItalFUT'; }, [copy.tag]);
  const digits = code === 'offline' ? ['—', '—', '—'] : code.split('');
  const canGoBack = typeof window !== 'undefined' && window.history.length > 1;

  return <section className={'error-page' + (compact ? ' error-page--compact' : '')} aria-labelledby="error-title">
    <GlowField count={8} />
    <div className="error-page__inner container">
      <div className="error-page__score" aria-hidden="true">
        {digits.map((digit, index) => <motion.span key={index} className="display-num"
          initial={reduce ? false : { opacity: 0, y: 30, rotateX: -70 }} animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: .08 * index, duration: .7, ease: [.16, 1, .3, 1] }}>
          {index === 1 && code === '404' ? <span className="error-page__ball"><Football3D size={120} /></span> : digit}
        </motion.span>)}
      </div>
      <p className="error-page__tag" role="status"><span className="dot dot--wait" />{copy.tag}{code !== 'offline' ? ' · ' + code : ''}</p>
      <h1 id="error-title" className="error-page__title">{copy.title} <span className="serif-accent">{copy.accent}</span></h1>
      <p className="lead">{copy.text}</p>
      {detail && <p className="error-page__detail">{detail}</p>}
      {left > 0 && <p className="error-page__wait" aria-live="polite">Potrai riprovare tra <b className="display-num">{left}</b> secondi.</p>}
      <div className="error-page__actions">
        {code === '401' && <RouterLink to="/accesso" className="btn btn--primary">Accedi</RouterLink>}
        {code === '429' && <RouterLink to="/accesso" className={'btn btn--primary' + (left > 0 ? ' is-disabled' : '')} aria-disabled={left > 0} onClick={event => { if (left > 0) event.preventDefault(); }}>Torna all’accesso</RouterLink>}
        {(retry || code === '500' || code === '503' || code === 'offline') && <button type="button" className="btn btn--primary" onClick={retry ?? (() => window.location.reload())}><RefreshRoundedIcon />Riprova</button>}
        {code !== '401' && code !== '429' && !retry && !['500', '503', 'offline'].includes(code) && <RouterLink to="/" className="btn btn--primary">Torna alla home</RouterLink>}
        {canGoBack && <button type="button" className="btn btn--ghost glass" onClick={() => navigate(-1)}><ArrowBackRoundedIcon />Indietro</button>}
        {['403', '429', '500', '503'].includes(code) && <RouterLink to="/contatti" className="btn btn--ghost glass">Contattaci</RouterLink>}
        {code === '429' && <RouterLink to="/accesso" state={{ recover: true }} className="btn btn--ghost glass">Password dimenticata?</RouterLink>}
      </div>
    </div>
  </section>;
}

/** Route /errore/:code — also used as the target of redirects for failed access attempts. */
export function ErrorRoute() {
  const { code = '404' } = useParams();
  const location = useLocation();
  const state = location.state as { detail?: string; waitSeconds?: number } | null;
  const known = (KNOWN.includes(code as ErrorCode) ? code : '404') as ErrorCode;
  return <ErrorView code={known} detail={state?.detail} waitSeconds={state?.waitSeconds} />;
}

export function NotFound() { return <ErrorView code="404" />; }
