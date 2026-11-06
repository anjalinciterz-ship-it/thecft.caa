import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { authLink, rememberRecoveryIntent } from '../lib/authNavigation';
import { apiRequest } from '../lib/api';
import { usePageMeta } from '../lib/seo';
import { Icon } from '../components/icons';
import { AuthShell, AuthCardHead, AuthField } from '../components/AuthShell';

export default function ForgotPassword() {
  usePageMeta({
    title: 'Reset your password · The Centre for Transformation',
    description: 'Request a single-use link by email and choose a new password for your member account.',
    path: '/forgot-password',
  });

  const { search } = useLocation();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  const submit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSending(true);
    setError('');
    try {
      await apiRequest('/auth/password/forgot', { method: 'POST', body: { email: email.trim() } });
      rememberRecoveryIntent(search);
      setSent(true);
    } catch (failure) {
      setError(failure.message || 'We could not accept that request. Please try again.');
    } finally {
      pending.current = false;
      setSending(false);
    }
  };

  return (
    <AuthShell
      image="/images/photos/mountain-sit.webp"
      eyebrow="Account Recovery"
      lead="We will email you a link to choose a new password. The link works once and expires in 30 minutes."
      titleLead="Reset Your "
      titleAccent="Password"
    >
      <AuthCardHead title="Forgot your password?" sub="Enter the address you signed up with." />

      {sent ? (
        <div className="au-note">
          <Icon name="mail" size={18} />
          <p>
            <b>Check your inbox</b>
            <span>
              If an account uses that address, a reset link is on its way. It works once and expires in 30 minutes.
              Open it on this device, or paste the link into your browser if the button does not appear.
            </span>
          </p>
        </div>
      ) : (
        <div className="au-note">
          <Icon name="info" size={18} />
          <p>
            <b>Secure recovery</b>
            <span>
              The link is single-use and cannot be reused after it sets a new password. Changing your password signs
              out every other device.
            </span>
          </p>
        </div>
      )}

      {sent ? (
        <p className="au-ok" role="status">
          Request received. We do not confirm whether an address has an account, so this page answers the same way
          for everyone.
        </p>
      ) : (
        <form className="au-fields" onSubmit={submit} aria-busy={sending}>
          <AuthField id="au-email" label="Email Address" icon="mail">
            <input
              id="au-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending}
              required
            />
          </AuthField>

          {error ? <p className="au-err" role="alert">{error}</p> : null}

          <button type="submit" className="au-submit" disabled={sending}>
            {sending ? 'Sending…' : 'Email me a reset link →'}
          </button>
        </form>
      )}

      <div className="au-rowline">
        <Link className="au-forgot" to={authLink('/login', search)}>Back to sign in</Link>
        {!sent ? <Link className="au-forgot" to={authLink('/signup', search)}>Create an account</Link> : null}
      </div>
    </AuthShell>
  );
}
