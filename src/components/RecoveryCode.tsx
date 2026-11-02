import { useState } from 'react';
import { Alert, Button, Checkbox, FormControlLabel } from '@mui/material';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';

/** One-time display of a recovery code: copy, download, explicit acknowledgement. */
export function RecoveryCode({ code, username, onDone, doneLabel = 'Continua' }: { code: string; username: string; onDone: () => void; doneLabel?: string }) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked: user can select the text */ }
  };
  const download = () => {
    const text = `ItalFUT — codice di recupero\n\nUsername: ${username}\nCodice: ${code}\n\nServe per reimpostare la password se la dimentichi.\nVale una sola volta. Conservalo in un posto sicuro e non condividerlo.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = `italfut-recupero-${username}.txt`;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    setSaved(true);
  };
  return <div className="recovery">
    <Alert severity="warning">Salva subito questo codice: è l’unico modo per recuperare l’account se dimentichi la password. Non lo mostreremo più.</Alert>
    <output className="recovery__code display-num" aria-label="Codice di recupero">{code}</output>
    <div className="recovery__actions">
      <Button variant="outlined" startIcon={copied ? <CheckRoundedIcon /> : <ContentCopyRoundedIcon />} onClick={() => void copy()}>{copied ? 'Copiato' : 'Copia'}</Button>
      <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={download}>Scarica .txt</Button>
    </div>
    <FormControlLabel control={<Checkbox checked={saved} onChange={(_, checked) => setSaved(checked)} />} label="Ho salvato il codice in un posto sicuro." />
    <Button variant="contained" size="large" fullWidth disabled={!saved} onClick={onDone}>{doneLabel}</Button>
  </div>;
}
