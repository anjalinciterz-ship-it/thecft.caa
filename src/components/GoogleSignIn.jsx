import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';

export function GoogleG({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';
let gisScriptPromise;

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!gisScriptPromise) {
    gisScriptPromise = new Promise((resolve, reject) => {
      let script = document.querySelector(`script[src="${GIS_SCRIPT}"]`);
      const existing = !!script;
      if (!script) {
        script = document.createElement('script');
        script.src = GIS_SCRIPT;
        script.async = true;
        script.defer = true;
      }
      const cleanup = () => {
        window.clearTimeout(timeout);
        script.removeEventListener('load', loaded);
        script.removeEventListener('error', failed);
      };
      const failed = () => {
        cleanup();
        reject(new Error('Google sign-in could not load. Check your connection or content blocker, then reload the page.'));
      };
      const loaded = () => {
        if (!window.google?.accounts?.id) return failed();
        cleanup();
        resolve(window.google.accounts.id);
      };
      const timeout = window.setTimeout(failed, 15000);
      script.addEventListener('load', loaded, { once: true });
      script.addEventListener('error', failed, { once: true });
      if (!existing) document.head.appendChild(script);
    });
  }
  return gisScriptPromise;
}

export default function GoogleSignIn({ onDone, label = 'Continue with Google', disabled = false }) {
  const { googleLogin, loading, authConfig, authConfigLoading, authConfigError } = useAuth();
  const [ready, setReady] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const buttonRef = useRef(null);
  const onDoneRef = useRef(onDone);
  const blockedRef = useRef(false);
  const pendingRef = useRef(false);
  onDoneRef.current = onDone;
  blockedRef.current = disabled || loading;
  const clientId = authConfig?.google?.clientId;
  const configured = authConfig?.google?.configured === true && typeof clientId === 'string' && !!clientId;

  useEffect(() => {
    if (!configured) return undefined;
    let active = true;
    let resizeObserver;
    const container = buttonRef.current;
    setReady(false);
    setError('');
    loadGoogleIdentity()
      .then((identity) => {
        if (!active) return;
        identity.initialize({
          client_id: clientId,
          auto_select: false,
          ux_mode: 'popup',
          callback: async (response) => {
            if (!active || pendingRef.current || blockedRef.current) return;
            if (response.error || !response.credential) {
              setError('Google did not complete sign-in. Please try again or sign in with email.');
              return;
            }
            pendingRef.current = true;
            setVerifying(true);
            setError('');
            try {
              // Only the backend can verify this ID token and establish a session.
              await googleLogin(response.credential);
              if (active) onDoneRef.current?.();
            } catch (failure) {
              if (active) setError(failure.message || 'Google sign-in failed. Please try again.');
            } finally {
              pendingRef.current = false;
              if (active) setVerifying(false);
            }
          },
        });
        let renderedWidth;
        const renderButton = () => {
          const width = Math.min(400, container.clientWidth || 300);
          if (!active || width === renderedWidth) return;
          renderedWidth = width;
          container.replaceChildren();
          identity.renderButton(container, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            width,
          });
          setReady(true);
        };
        resizeObserver = new ResizeObserver(renderButton);
        resizeObserver.observe(container);
        renderButton();
      })
      .catch((failure) => {
        if (active) setError(failure.message || 'Google sign-in is unavailable. Please reload and try again.');
      });
    return () => {
      active = false;
      resizeObserver?.disconnect();
      container?.replaceChildren();
    };
  }, [clientId, configured, googleLogin]);

  const configError = authConfigError?.message || (!authConfigLoading && !configured
    ? 'Google sign-in is not configured. Please use email sign-in or contact support.' : '');
  const busy = disabled || loading || verifying;

  return (
    <div className="au-gis" aria-label={label} aria-busy={verifying}>
      <div
        ref={buttonRef}
        className="au-gis-button"
        inert={busy || !!configError ? '' : undefined}
        aria-disabled={busy || !!configError}
      />
      {!configError && !error && (authConfigLoading || !ready || verifying) ? (
        <p className="au-session" role="status">{verifying ? 'Verifying your Google sign-in…' : 'Loading Google sign-in…'}</p>
      ) : null}
      {configError || error ? <p className="au-err" role="alert">{configError || error}</p> : null}
    </div>
  );
}
