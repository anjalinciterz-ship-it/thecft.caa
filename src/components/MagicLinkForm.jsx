import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { authLink, rememberRecoveryIntent } from '../lib/authNavigation';
import { AuthField } from './AuthShell';
import { Icon } from './icons';

/**
 * One-click sign-in: the mail carries the credential, so this form only asks for
 * the address and then waits. Where the member came from is remembered locally
 * rather than put into the link, so no client-supplied redirect leaves the server.
 */
export default function MagicLinkForm() {
  const { authConfig, authConfigLoading, authConfigError } = useAuth();
  const { search } = useLocation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [now, setNow] = useState(Date.now());
  const mounted = useRef(false);
  const pending = useRef(false);
  const request = useRef(null);
  const emailInput = useRef(null);

  const enabled = authConfig?.magicLink?.enabled === true;
  const minutes = authConfig?.magicLink?.minutes || 10;
  const unavailable = !authConfigLoading && !enabled;
  const waiting = busy || authConfigLoading;
  const resendSeconds = sent ? Math.max(0, Math.ceil((Date.parse(sent.resendAt) - now) / 1000)) : 0;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!sent) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sent]);

  const send = async (event) => {
    event?.preventDefault();
    if (pending.current || waiting || !enabled || resendSeconds > 0) return;
    setError(''); setErrorCode('');
    const address = email.trim();
    if (!address) return;
    pending.current = true; setBusy(true);
    const controller = new AbortController(); request.current = controller;
    try {
      const result = await apiRequest('/auth/magic/request', { method: 'POST', signal: controller.signal, body: { email: address } });
      if (!mounted.current) return;
      if (!result?.maskedDestination || !Number.isFinite(Date.parse(result.expiresAt))) {
        throw new Error('The sign-in link request could not be confirmed. Please try again.');
      }
      rememberRecoveryIntent(search);
      setSent(result); setNow(Date.now());
    } catch (failure) {
      if (mounted.current) { setError(failure.message || 'The sign-in link could not be sent.'); setErrorCode(failure.code || ''); emailInput.current?.focus(); }
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return <div className="au-otp">
    {unavailable && <p className="au-method-notice" role="status">{authConfigError ? 'Sign-in availability could not be loaded. Please refresh the page.' : 'Sign-in links are not switched on yet. Use an email code or your password for now.'}</p>}
    {!sent ? <form className="au-fields" onSubmit={send} aria-busy={waiting}>
      <AuthField id="au-magic-email" label="Email address" icon="mail">
        <input id="au-magic-email" ref={emailInput} type="email" autoComplete="email" maxLength={254}
          placeholder="you@example.com" required value={email} disabled={waiting || !enabled}
          onChange={(event) => setEmail(event.target.value)} />
      </AuthField>
      <p className="au-session">We’ll email you a link that signs you in when you open it. No password, no code to type.</p>
      <button className="au-submit" disabled={waiting || !enabled}>{busy ? 'Sending link…' : authConfigLoading ? 'Checking availability…' : 'Email me a sign-in link'}</button>
    </form> : <div className="au-note">
      <Icon name="mail" size={18} />
      <p>
        <b>Check your inbox</b>
        <span>
          A sign-in link is on its way to <strong>{sent.maskedDestination}</strong>. It works once and expires in {minutes} minutes.
          Open it on this device, or paste the link into your browser if the button does not appear.
        </span>
      </p>
    </div>}
    {sent && <div className="au-code-actions">
      <button type="button" disabled={waiting || resendSeconds > 0} onClick={send}>{resendSeconds > 0 ? `Send again in ${resendSeconds}s` : 'Send a new link'}</button>
      <button type="button" disabled={waiting} onClick={() => { setSent(null); setError(''); setErrorCode(''); emailInput.current?.focus(); }}>Change email</button>
    </div>}
    {error && <p className="au-err" role="alert">{error}</p>}
    {errorCode === 'account_not_found' && <p className="au-foot"><Link to={authLink('/signup', search)}>Create your account</Link></p>}
  </div>;
}
