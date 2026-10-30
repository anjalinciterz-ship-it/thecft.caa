import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { authDestination, authLink } from '../lib/authNavigation';
import { usePageMeta } from '../lib/seo';
import { Icon } from '../components/icons';
import GoogleSignIn from '../components/GoogleSignIn';
import OtpForm from '../components/OtpForm';
import { AuthShell, AuthCardHead, AuthField, AuthOr } from '../components/AuthShell';

export default function Login() {
  usePageMeta({ title: 'Log In · The Centre for Transformation', description: 'Sign in with an email code, mobile code, Google, or your password.', path: '/login' });
  const { login, loading, isAuthed } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const destination = authDestination(search);
  const [method, setMethod] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const pending = useRef(false);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (isAuthed && !loading) navigate(destination, { replace: true }); }, [isAuthed, loading, navigate, destination]);
  const land = () => navigate(destination, { replace: true });
  const submit = async (event) => {
    event.preventDefault();
    if (pending.current || loading) return;
    pending.current = true; setSubmitting(true); setError('');
    try {
      await login(identifier.trim(), password);
      if (mounted.current) land();
    } catch (failure) {
      if (mounted.current) setError(failure.message || 'Sign-in failed. Please try again.');
    } finally {
      pending.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };

  return <AuthShell image="/images/site/auth-beach.webp" eyebrow="Welcome Back" titleLead="Continue Your" titleAccent="Journey" lead="Your courses, books and personal guidance, together in one place. Choose the sign-in method that suits you.">
    <AuthCardHead title="Welcome Back" sub="Sign in securely. Pick up where you left off." />
    {destination !== '/dashboard' && <p className="au-method-notice">Your selection is saved. We’ll take you back after sign-in.</p>}
    <div className="au-methods" role="group" aria-label="Sign-in method">
      {[['email', 'Email code', 'mail'], ['sms', 'Mobile code', 'phone'], ['password', 'Password', 'lock']].map(([value, label, icon]) => <button key={value} type="button" aria-pressed={method === value} disabled={submitting || loading} onClick={() => { setMethod(value); setError(''); }}><Icon name={icon} size={18} /><span>{label}</span></button>)}
    </div>
    {method !== 'password' ? <OtpForm key={method} channel={method} onDone={land} /> : <form className="au-fields" onSubmit={submit} aria-busy={submitting || loading}>
      <AuthField id="au-identifier" label="Email, mobile number or username" icon="seeker"><input id="au-identifier" type="text" autoComplete="username" placeholder="Email, +country code number, or username" maxLength={254} required value={identifier} disabled={submitting || loading} onChange={(event) => setIdentifier(event.target.value)} /></AuthField>
      <AuthField id="au-password" label="Password" icon="lock">
        <input id="au-password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" maxLength={200} required value={password} disabled={submitting || loading} onChange={(event) => setPassword(event.target.value)} />
        <button type="button" className="au-eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show}><Icon name={show ? 'eyeOff' : 'eye'} size={17} /></button>
      </AuthField>
      <p className="au-session">Use a verified mobile number with its country code. You can set an optional password and username in account settings.</p>
      <div className="au-rowline"><Link className="au-forgot" to={authLink('/forgot-password', search)}>Forgot password?</Link></div>
      {error && <p className="au-err" role="alert">{error}</p>}
      <button className="au-submit" disabled={submitting || loading}>{submitting ? 'Signing In…' : loading ? 'Please wait…' : 'Sign In'}</button>
    </form>}
    <AuthOr />
    <GoogleSignIn disabled={submitting} onDone={land} />
    <p className="au-foot">New here? <Link to={authLink('/signup', search)}>Create an account</Link></p>
  </AuthShell>;
}
