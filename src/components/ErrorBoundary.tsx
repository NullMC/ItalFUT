import { Component, lazy, type ComponentType, type ErrorInfo, type ReactNode } from 'react';
import { ErrorView } from '../pages/ErrorPage';

const RELOAD_KEY = 'italfut_chunk_reload';
const isChunkError = (error: unknown) =>
  error instanceof Error && /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(error.message);

/**
 * After a new deploy, an open tab may request page chunks that no longer exist.
 * Reload once to pick up the new build instead of showing a blank page.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyPage<T extends ComponentType<any>>(loader: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const module = await loader();
      try { sessionStorage.removeItem(RELOAD_KEY); } catch { /* ignore */ }
      return module;
    } catch (error) {
      let reloaded = false;
      try { reloaded = sessionStorage.getItem(RELOAD_KEY) === '1'; sessionStorage.setItem(RELOAD_KEY, '1'); } catch { /* ignore */ }
      if (isChunkError(error) && !reloaded) { window.location.reload(); return new Promise<never>(() => {}); }
      throw error;
    }
  });
}

/** Catches render errors anywhere below it and shows the Error page instead of a white screen. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* no third-party error reporting by design */ }
  componentDidUpdate(previous: { resetKey?: string }) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null });
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return <ErrorView code="offline" retry={() => window.location.reload()} />;
    return <ErrorView code={isChunkError(error) ? '503' : '500'}
      detail={isChunkError(error) ? 'È disponibile una nuova versione del sito: ricarica la pagina.' : undefined}
      retry={() => window.location.reload()} />;
  }
}
