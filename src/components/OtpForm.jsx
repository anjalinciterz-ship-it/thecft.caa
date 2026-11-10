import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { authLink } from '../lib/authNavigation';
import { AuthField } from './AuthShell';
import { Icon } from './icons';

export default function OtpForm({ purpose = 'login', fixedDestination = '', onDone }) {
  const { authConfig, authConfigLoading, authConfigError, loading, verifyOtp } = useAuth();
  const { search } = useLocation();
  const [destination, setDestination] = useState(fixedDestination);
  const [profile, setProfile] = useState({ firstName: '', lastName: '', termsAccepted: false, marketingConsent: false });
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [notice, setNotice] = useState('');
  const mounted = useRef(false);
  const pending = useRef(false);
  const request = useRef(null);
  const codeInput = useRef(null);
  const enabled = authConfig?.otp?.email?.enabled === true;
  const unavailable = !authConfigLoading && !enabled;
  const waiting = busy || loading || authConfigLoading;
  const resendSeconds = challenge ? Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - now) / 1000)) : 0;
  const expired = challenge && Date.parse(challenge.expiresAt) <= now;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!challenge) return undefined;
    codeInput.current?.focus();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  const send = async (event) => {
    event?.preventDefault();
    if (pending.current || waiting || !enabled || resendSeconds > 0) return;
    setError(''); setErrorCode(''); setNotice('');
    const normalized = destination.trim();
    pending.current = true; setBusy(true);
    const controller = new AbortController(); request.current = controller;
    try {
      const result = await apiRequest('/auth/otp/request', {
        method: 'POST', signal: controller.signal,
        body: { destination: normalized, purpose, ...(purpose === 'signup' ? {
          ...profile, firstName: profile.firstName.trim(), lastName: profile.lastName.trim(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        } : {}) },
      });
      if (!mounted.current) return;
      if (!result?.challengeId || !Number.isFinite(Date.parse(result.expiresAt)) || !Number.isFinite(Date.parse(result.resendAt))) {
        throw new Error('The verification request could not be confirmed. Please try again.');
      }
      setChallenge(result); setCode(''); setNow(Date.now());
      setNotice(`A verification code was sent to ${result.maskedDestination}.`);
    } catch (failure) {
      if (mounted.current) { setError(failure.message || 'The code could not be sent.'); setErrorCode(failure.code || ''); }
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const verify = async (event) => {
    event.preventDefault();
    if (pending.current || waiting || expired || !/^\d{6}$/.test(code)) return;
    pending.current = true; setBusy(true); setError(''); setErrorCode(''); setNotice('');
    try {
      await verifyOtp(challenge.challengeId, code);
      if (mounted.current) { setCode(''); onDone?.(); }
    } catch (failure) {
      if (mounted.current) { setError(failure.message || 'The code could not be verified.'); setErrorCode(failure.code || ''); codeInput.current?.focus(); }
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  return <div className="au-otp">
    {unavailable && <p className="au-method-notice" role="status">{authConfigError ? 'Sign-in availability could not be loaded. Please refresh the page.' : `Email verification is not available yet. ${purpose === 'link' ? 'Please try again later.' : 'Use another sign-in method for now.'}`}</p>}
    {!challenge ? <form className="au-fields" onSubmit={send} aria-busy={waiting}>
      {purpose === 'signup' && <div className="au-row2">
        <AuthField id="otp-first" label="First name" icon="seeker"><input id="otp-first" autoComplete="given-name" maxLength={60} required value={profile.firstName} disabled={waiting} onChange={(event) => setProfile({ ...profile, firstName: event.target.value })} /></AuthField>
        <AuthField id="otp-last" label="Last name (optional)" icon="seeker"><input id="otp-last" autoComplete="family-name" maxLength={60} value={profile.lastName} disabled={waiting} onChange={(event) => setProfile({ ...profile, lastName: event.target.value })} /></AuthField>
      </div>}
      <AuthField id="otp-destination" label="Email address" icon="mail">
        <input id="otp-destination" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required value={destination} readOnly={!!fixedDestination} disabled={waiting} onChange={(event) => setDestination(event.target.value)} />
      </AuthField>
      <p className="au-session">{purpose === 'link' ? 'Verify ownership to add this sign-in method to your current account.' : 'We’ll send a six-digit code. No password needed.'}</p>
      {purpose === 'signup' && <>
        <label className="au-check"><input type="checkbox" required checked={profile.termsAccepted} disabled={waiting} onChange={(event) => setProfile({ ...profile, termsAccepted: event.target.checked })} /><span className="box" aria-hidden="true"><Icon name="check" size={12} /></span><span>I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.</span></label>
        <label className="au-check"><input type="checkbox" checked={profile.marketingConsent} disabled={waiting} onChange={(event) => setProfile({ ...profile, marketingConsent: event.target.checked })} /><span className="box" aria-hidden="true"><Icon name="check" size={12} /></span><span>Email me news and course updates (optional).</span></label>
      </>}
      <button className="au-submit" disabled={waiting || !enabled}>{busy ? 'Sending code…' : authConfigLoading ? 'Checking availability…' : 'Send email code'}</button>
    </form> : <form className="au-fields" onSubmit={verify} aria-busy={waiting}>
      <p className="au-session">Enter the code sent to <strong>{challenge.maskedDestination}</strong>. Keep this page open until verification is complete.</p>
      <AuthField id="otp-code" label="Verification code" icon="lock"><input ref={codeInput} id="otp-code" className="au-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="000000" required value={code} disabled={waiting || expired} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} /></AuthField>
      {expired && <p className="au-err" role="status">This code has expired. Request a new code to continue.</p>}
      <button className="au-submit" disabled={waiting || expired || code.length !== 6}>{busy ? 'Verifying…' : purpose === 'link' ? 'Verify and add' : purpose === 'signup' ? 'Verify and create account' : 'Verify and sign in'}</button>
      <div className="au-code-actions"><button type="button" disabled={waiting || resendSeconds > 0} onClick={send}>{resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Send a new code'}</button><button type="button" disabled={waiting} onClick={() => { setChallenge(null); setCode(''); setError(''); setNotice(''); }}>Change email</button></div>
    </form>}
    {notice && <p className="au-session" role="status">{notice}</p>}
    {error && <p className="au-err" role="alert">{error}</p>}
    {errorCode === 'account_not_found' && <p className="au-foot"><Link to={authLink('/signup', search)}>Create your account</Link></p>}
  </div>;
}
