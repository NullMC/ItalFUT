/*
 * Consent manager. Today ItalFUT only uses technical storage, so the banner is
 * informative and no optional category can be switched on. The structure is
 * ready for future optional tools: `useConsent().allows('analytics')` must gate
 * any non-essential SDK, which stays blocked until an explicit opt-in.
 * No pre-ticked boxes, "reject" is as prominent as "accept", choices expire
 * after 6 months (Garante, linee guida cookie 10/06/2021).
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Switch } from '@mui/material';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Link as RouterLink } from 'react-router-dom';

type Category = 'necessary' | 'analytics';
type Choice = { version: 2; date: string; analytics: boolean };
const KEY = 'italfut_consent_v2';
const MAX_AGE = 1000 * 60 * 60 * 24 * 182;
/** Optional services actually installed. Empty = nothing optional runs. */
const OPTIONAL_SERVICES: Record<Exclude<Category, 'necessary'>, string[]> = { analytics: [] };

function read(): Choice | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Choice | null;
    if (!value || value.version !== 2 || Date.now() - new Date(value.date).getTime() > MAX_AGE) return null;
    return value;
  } catch { return null; }
}

type ConsentContext = { openPreferences: () => void; allows: (category: Category) => boolean };
const CookieContext = createContext<ConsentContext | null>(null);
export function useCookiePreferences() {
  const context = useContext(CookieContext);
  if (!context) throw new Error('CookieSettingsProvider mancante');
  return context;
}

export function CookieSettingsProvider({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const [choice, setChoice] = useState<Choice | null>(read);
  const [dialog, setDialog] = useState(false);
  const [draftAnalytics, setDraftAnalytics] = useState(false);
  const save = useCallback((analytics: boolean) => {
    const next: Choice = { version: 2, date: new Date().toISOString(), analytics: analytics && OPTIONAL_SERVICES.analytics.length > 0 };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable: banner will show again */ }
    setChoice(next); setDialog(false);
  }, []);
  const value = useMemo<ConsentContext>(() => ({
    openPreferences: () => { setDraftAnalytics(Boolean(choice?.analytics)); setDialog(true); },
    allows: category => category === 'necessary' || Boolean(choice?.[category]),
  }), [choice]);
  const hasOptional = OPTIONAL_SERVICES.analytics.length > 0;

  return <CookieContext.Provider value={value}>
    {children}
    <AnimatePresence>
      {!choice && !dialog && <motion.section role="region" aria-label="Informativa cookie" className="cookie-banner glass"
        initial={reduce ? false : { opacity: 0, y: 24, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduce ? undefined : { opacity: 0, y: 16 }}
        transition={{ duration: .5, ease: [.16, 1, .3, 1] }}>
        <h2>Cookie e privacy</h2>
        <p>Usiamo solo strumenti tecnici necessari per l’accesso e per ricordare le tue preferenze. Nessun tracciamento, nessuna pubblicità. <RouterLink to="/cookie-policy">Cookie policy</RouterLink></p>
        <div className="cookie-banner__actions">
          <Button variant="outlined" onClick={() => save(false)}>Rifiuta facoltativi</Button>
          <Button variant="outlined" onClick={value.openPreferences}>Personalizza</Button>
          <Button variant="outlined" onClick={() => save(true)}>Accetta</Button>
        </div>
      </motion.section>}
    </AnimatePresence>
    <Dialog open={dialog} onClose={() => setDialog(false)} fullWidth maxWidth="sm" aria-labelledby="cookie-dialog-title">
      <DialogTitle id="cookie-dialog-title">Preferenze cookie</DialogTitle>
      <DialogContent>
        <div className="consent-row">
          <FormControlLabel disabled control={<Switch checked />} label={<b>Necessari</b>} />
          <p>Sessione di accesso, tema chiaro/scuro, configurazione del preventivo e registrazione di queste scelte. Sempre attivi perché indispensabili.</p>
        </div>
        <div className="consent-row">
          <FormControlLabel disabled={!hasOptional} control={<Switch checked={draftAnalytics && hasOptional} onChange={(_, checked) => setDraftAnalytics(checked)} />} label={<b>Statistiche</b>} />
          <p>{hasOptional ? 'Misurazione anonima delle visite: ' + OPTIONAL_SERVICES.analytics.join(', ') + '.' : 'Nessun servizio di statistica è installato: non c’è nulla da attivare.'}</p>
        </div>
        <p className="consent-note">Puoi cambiare idea in qualsiasi momento dal link “Preferenze cookie” in fondo alla pagina. Dettagli nella <RouterLink to="/cookie-policy" onClick={() => setDialog(false)}>cookie policy</RouterLink>.</p>
      </DialogContent>
      <DialogActions sx={{ p: 2.5, gap: 1, flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={() => save(false)}>Rifiuta facoltativi</Button>
        <Button variant="outlined" onClick={() => save(draftAnalytics)}>Salva scelte</Button>
      </DialogActions>
    </Dialog>
  </CookieContext.Provider>;
}
