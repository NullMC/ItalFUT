import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Switch, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const KEY = 'italfut_cookie_notice_v1';
const CookieContext = createContext<{ openPreferences: () => void } | null>(null);
export function useCookiePreferences() {
  const context = useContext(CookieContext);
  if (!context) throw new Error('CookieSettingsProvider mancante');
  return context;
}
export function CookieSettingsProvider({ children }: { children: ReactNode }) {
  const [openPreferences, setOpenPreferences] = useState(false);
  const value = useMemo(() => ({ openPreferences: () => setOpenPreferences(true) }), []);
  return <CookieContext.Provider value={value}>
    {children}
    <CookieNotice openPreferences={openPreferences} onPreferencesOpen={setOpenPreferences} />
  </CookieContext.Provider>;
}
const technicalOnly = {
  auth: 'Sessione Supabase Auth: necessaria per effettuare e mantenere l’accesso.',
  theme: 'Preferenza chiaro/scuro: conservata nel browser per la tua comodità.',
  quote: 'Configurazione del preventivo: conservata nella sessione corrente.',
  notice: 'Presa visione dell’informativa: evita di riproporre l’avviso a ogni visita.',
};

export function CookieNotice({ openPreferences, onPreferencesOpen }: {
  openPreferences: boolean;
  onPreferencesOpen: (open: boolean) => void;
}) {
  const [acknowledged, setAcknowledged] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === 'read'; } catch { return false; }
  });
  const [details, setDetails] = useState(openPreferences);
  useEffect(() => { if (openPreferences) setDetails(true); }, [openPreferences]);

  const dismiss = () => {
    setAcknowledged(true);
    try { localStorage.setItem(KEY, 'read'); } catch { /* privacy mode */ }
    setDetails(false); onPreferencesOpen(false);
  };
  return <>
    {!acknowledged && !details && <section role="region" aria-label="Informativa strumenti tecnici" className="cookie-notice liquid-glass">
      <div><strong>Privacy e strumenti tecnici</strong>
        <p>Usiamo strumenti essenziali per accesso, tema e configurazione. Non carichiamo al momento analytics o pubblicità. Nessun cookie facoltativo è attivo.</p>
        <RouterLink to="/cookie-policy">Leggi la cookie policy</RouterLink>
      </div>
      <div className="cookie-notice-actions">
        <Button variant="outlined" onClick={() => setDetails(true)}>Dettagli</Button>
        <Button variant="contained" onClick={dismiss}>Continua con i necessari</Button>
      </div>
    </section>}
    <Dialog open={details} onClose={() => { setDetails(false); onPreferencesOpen(false); }} fullWidth maxWidth="sm" aria-labelledby="cookie-dialog-title">
      <DialogTitle id="cookie-dialog-title">Preferenze privacy e cookie</DialogTitle>
      <DialogContent>
        <Typography variant="body2" paragraph>Al momento ItalFUT utilizza soltanto strumenti strettamente necessari o richiesti per la tua esperienza. Non ci sono categorie di tracciamento facoltativo da attivare.</Typography>
        <FormControlLabel disabled label="Strumenti tecnici — sempre necessari" control={<Switch checked />} />
        <FormControlLabel disabled label="Analytics di terze parti — non installati" control={<Switch checked={false} />} />
        <FormControlLabel disabled label="Pubblicità e profilazione — non installati" control={<Switch checked={false} />} />
        <ul className="cookie-tech-list">{Object.values(technicalOnly).map(value => <li key={value}>{value}</li>)}</ul>
        <Typography variant="body2">Se saranno introdotte funzionalità non essenziali, verranno bloccate prima del consenso esplicito e questa interfaccia sarà aggiornata. Consulta la <RouterLink to="/cookie-policy" onClick={() => { setDetails(false); onPreferencesOpen(false); }}>cookie policy</RouterLink>.</Typography>
      </DialogContent>
      <DialogActions><Button onClick={() => { setDetails(false); onPreferencesOpen(false); }}>Chiudi</Button><Button variant="contained" onClick={dismiss}>Ho capito</Button></DialogActions>
    </Dialog>
  </>;
}
