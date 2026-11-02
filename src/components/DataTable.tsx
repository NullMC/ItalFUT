/*
 * Data table for the console editors and the superadmin. Pattern from the 21st.dev
 * dashboard/admin templates (Settle "Transactions", Studio Admin "Customers"):
 * one card holding toolbar (search + segmented filter + select filter), sortable
 * table with muted uppercase headers and tabular numerals, footer with
 * "Mostrati x–y di n" and numbered pagination. On phones every row becomes a card.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import UnfoldMoreRoundedIcon from '@mui/icons-material/UnfoldMoreRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { ScrollRail } from './ScrollRail';

export type Column<T> = {
  key: string; title: string; render: (row: T) => ReactNode;
  /** Value used for sorting and searching. */
  value?: (row: T) => string | number | null | undefined;
  align?: 'start' | 'end' | 'center'; width?: string; primary?: boolean; hideOnMobile?: boolean;
};
export type Filter<T> = { label: string; options: { id: string; label: string }[]; test: (row: T, id: string) => boolean; kind?: 'segmented' | 'select' };

type Props<T> = {
  rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string;
  actions?: (row: T) => ReactNode; filters?: Filter<T>[]; searchLabel?: string;
  pageSize?: number; empty?: ReactNode; noun?: [string, string]; caption?: string;
  /** Server-side mode: the parent controls search/pages and passes the total. */
  remote?: { total: number; page: number; onPage: (page: number) => void; query: string; onQuery: (q: string) => void; loading?: boolean };
  toolbarExtra?: ReactNode;
};

const collator = new Intl.Collator('it', { numeric: true, sensitivity: 'base' });

export function DataTable<T>({ rows, columns, rowKey, actions, filters = [], searchLabel = 'Cerca', pageSize = 25, empty, noun = ['elemento', 'elementi'], caption, remote, toolbarExtra }: Props<T>) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const q = remote ? remote.query : query;

  const filtered = useMemo(() => {
    if (remote) return rows;
    let list = rows;
    filters.forEach((filter, i) => { const id = picked[i]; if (id) list = list.filter(row => filter.test(row, id)); });
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter(row => columns.some(c => String(c.value ? c.value(row) ?? '' : '').toLowerCase().includes(needle)));
    if (sort) {
      const col = columns.find(c => c.key === sort.key);
      if (col?.value) list = [...list].sort((a, b) => {
        const x = col.value!(a), y = col.value!(b);
        if (x == null || x === '') return 1; if (y == null || y === '') return -1;
        return (typeof x === 'number' && typeof y === 'number' ? x - y : collator.compare(String(x), String(y))) * sort.dir;
      });
    }
    return list;
  }, [rows, filters, picked, q, sort, columns, remote]);

  useEffect(() => { if (!remote) setPage(0); }, [q, picked, sort, remote]);
  const total = remote ? remote.total : filtered.length;
  const current = remote ? remote.page : page;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const visible = remote ? filtered : filtered.slice(current * pageSize, current * pageSize + pageSize);
  const go = (next: number) => { const p = Math.min(pages - 1, Math.max(0, next)); if (remote) remote.onPage(p); else setPage(p); };
  const counter = (n: number) => n.toLocaleString('it-IT') + ' ' + (n === 1 ? noun[0] : noun[1]);
  const pageList = (() => {
    const set = new Set([0, pages - 1, current - 1, current, current + 1].filter(p => p >= 0 && p < pages));
    return [...set].sort((a, b) => a - b);
  })();

  return <div className="data-card glass">
    <div className="data-toolbar">
      <label className="data-search">
        <SearchRoundedIcon aria-hidden="true" />
        <input type="search" placeholder={searchLabel} aria-label={searchLabel} value={q}
          onChange={event => remote ? remote.onQuery(event.target.value) : setQuery(event.target.value)} />
      </label>
      {filters.map((filter, i) => filter.kind === 'select'
        ? <label key={filter.label} className="data-select"><span className="sr-only">{filter.label}</span>
            <select value={picked[i] ?? ''} onChange={event => setPicked(old => ({ ...old, [i]: event.target.value }))}>
              <option value="">{filter.label}: tutte</option>
              {filter.options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select></label>
        : <ScrollRail key={filter.label} className="segmented segmented--rail" role="group" label={filter.label} activeKey={picked[i]}>
            <button type="button" aria-pressed={!picked[i]} onClick={() => setPicked(old => ({ ...old, [i]: '' }))}>Tutti</button>
            {filter.options.map(option => <button key={option.id} type="button" aria-pressed={picked[i] === option.id} onClick={() => setPicked(old => ({ ...old, [i]: option.id }))}>
              {option.label}<em>{rows.filter(row => filter.test(row, option.id)).length}</em></button>)}
          </ScrollRail>)}
      {toolbarExtra}
      <span className="data-count" aria-live="polite">{counter(total)}</span>
    </div>
    <ScrollRail className="data-scroll" tabIndex={0} label={caption ?? 'Tabella'}>
      <table className="data-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead><tr>
          {columns.map(col => {
            const active = sort?.key === col.key;
            return <th key={col.key} scope="col" className={col.hideOnMobile ? 'hide-mobile' : undefined} style={{ width: col.width, textAlign: col.align === 'end' ? 'right' : col.align === 'center' ? 'center' : undefined }}
              aria-sort={active ? (sort!.dir === 1 ? 'ascending' : 'descending') : undefined}>
              {col.value && !remote ? <button type="button" className={'data-sort' + (active ? ' is-active' : '')}
                onClick={() => setSort(old => old?.key === col.key ? (old.dir === 1 ? { key: col.key, dir: -1 } : null) : { key: col.key, dir: 1 })}>
                {col.title}{active ? <ArrowUpwardRoundedIcon className={sort!.dir === -1 ? 'is-desc' : ''} /> : <UnfoldMoreRoundedIcon />}
              </button> : col.title}
            </th>;
          })}
          {actions && <th scope="col" className="data-table__actions"><span className="sr-only">Azioni</span></th>}
        </tr></thead>
        <tbody>
          {visible.map(row => <tr key={rowKey(row)}>
            {columns.map(col => <td key={col.key} data-label={col.title}
              className={(col.primary ? 'is-primary ' : '') + (col.hideOnMobile ? 'hide-mobile ' : '') + (col.align === 'end' ? 'is-end' : col.align === 'center' ? 'is-center' : '')}>
              {col.render(row)}</td>)}
            {actions && <td className="data-table__actions">{actions(row)}</td>}
          </tr>)}
          {visible.length === 0 && <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="data-table__empty">
            {remote?.loading ? 'Caricamento…' : q || Object.values(picked).some(Boolean) ? 'Nessun risultato con questi filtri.' : empty ?? 'Nessun elemento.'}</td></tr>}
        </tbody>
      </table>
    </ScrollRail>
    {total > 0 && <div className="data-foot">
      <span>Mostrati <b>{(current * pageSize + 1).toLocaleString('it-IT')}–{Math.min(total, current * pageSize + pageSize).toLocaleString('it-IT')}</b> di {counter(total)}</span>
      {pages > 1 && <nav className="pager" aria-label="Pagine">
        <button type="button" onClick={() => go(current - 1)} disabled={current === 0} aria-label="Pagina precedente"><ChevronLeftRoundedIcon /></button>
        {pageList.map((p, i) => <span key={p} className="pager__group">
          {i > 0 && p - pageList[i - 1] > 1 && <span className="pager__gap" aria-hidden="true">…</span>}
          <button type="button" onClick={() => go(p)} aria-current={p === current ? 'page' : undefined} aria-label={'Pagina ' + (p + 1)}>{p + 1}</button>
        </span>)}
        <button type="button" onClick={() => go(current + 1)} disabled={current >= pages - 1} aria-label="Pagina successiva"><ChevronRightRoundedIcon /></button>
      </nav>}
    </div>}
  </div>;
}
