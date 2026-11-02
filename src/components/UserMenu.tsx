import { useId, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircularProgress, Divider, ListItemIcon, Menu, MenuItem } from '@mui/material';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { roleLabel, useAuth, type Role } from '../auth/AuthProvider';

export type RoleLink = { label: string; to: string; icon: ReactNode; end?: boolean };

/** Navigation each role can reach. The server enforces the same split (RLS + admin RPCs). */
export function roleLinks(role: Role | null): RoleLink[] {
  if (!role || role === 'guest') return [];
  const common: RoleLink[] = [
    { label: 'I tuoi tornei', to: '/console', icon: <EmojiEventsRoundedIcon fontSize="small" /> },
    { label: 'Account e dati', to: '/account', icon: <ManageAccountsRoundedIcon fontSize="small" /> },
  ];
  if (role === 'admin') return [
    { label: 'Superadmin', to: '/admin', icon: <AdminPanelSettingsRoundedIcon fontSize="small" />, end: true },
    { label: 'Richieste', to: '/admin/support_requests', icon: <SupportAgentRoundedIcon fontSize="small" /> },
    ...common,
  ];
  return [...common, { label: 'Assistenza', to: '/contatti', icon: <SupportAgentRoundedIcon fontSize="small" /> }];
}

export function displayName(username: string | undefined | null) {
  return username ? '@' + username : 'Il tuo account';
}

/** Avatar with the first letter of the username; shield badge for the superadmin. */
export function UserAvatar({ username, role, size = 32 }: { username?: string | null; role: Role | null; size?: number }) {
  return <span className={'user-avatar' + (role === 'admin' ? ' user-avatar--admin' : '')} style={{ width: size, height: size }} aria-hidden="true">
    {role === null ? <CircularProgress size={size * .5} color="inherit" /> : (username?.[0] ?? '?').toUpperCase()}
  </span>;
}

export function RoleBadge({ role }: { role: Role | null }) {
  if (role === null) return <span className="role-badge role-badge--pending">Verifica ruolo…</span>;
  return <span className={'role-badge role-badge--' + role}>{roleLabel[role]}</span>;
}

/** Signed-in identity in the navbar: username, role and the menu of the pages that role can open. */
export function UserMenu() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const close = () => setAnchor(null);
  const go = (to: string) => { close(); navigate(to); };
  const name = displayName(profile?.username);
  const links = roleLinks(role);
  // The superadmin menu also reaches the user list directly, next to the requests.
  const menuLinks = role === 'admin'
    ? [...links.slice(0, 2), { label: 'Utenti', to: '/admin/profiles', icon: <PeopleAltRoundedIcon fontSize="small" /> }, ...links.slice(2)]
    : links;

  return <>
    <button type="button" className="user-chip" aria-haspopup="menu" aria-expanded={Boolean(anchor)} aria-controls={anchor ? menuId : undefined}
      aria-label={`Menu account: ${name}, ${role ? roleLabel[role] : 'verifica del ruolo in corso'}`}
      onClick={event => setAnchor(event.currentTarget)}>
      <UserAvatar username={profile?.username} role={role} />
      <span className="user-chip__text">
        <b>{name}</b>
        <small>{role ? roleLabel[role] : 'Verifica…'}</small>
      </span>
      <ExpandMoreRoundedIcon className="user-chip__caret" fontSize="small" />
    </button>
    <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={close}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { className: 'user-menu glass' }, list: { 'aria-label': 'Menu account' } }}>
      <li className="user-menu__head" role="presentation">
        <UserAvatar username={profile?.username} role={role} size={40} />
        <span><b>{name}</b><RoleBadge role={role} /></span>
      </li>
      <Divider component="li" role="presentation" />
      {menuLinks.map(link => <MenuItem key={link.to} onClick={() => go(link.to)}>
        <ListItemIcon>{link.icon}</ListItemIcon>{link.label}
      </MenuItem>)}
      <Divider component="li" role="presentation" />
      <MenuItem onClick={() => { close(); void signOut().then(() => navigate('/', { replace: true })); }}>
        <ListItemIcon><LogoutRoundedIcon fontSize="small" /></ListItemIcon>Esci
      </MenuItem>
    </Menu>
  </>;
}
