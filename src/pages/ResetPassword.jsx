import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authLink, clearRecoveryIntent, recoveryAuthSearch } from '../lib/authNavigation';
import { apiRequest } from '../lib/api';
import { usePageMeta } from '../lib/seo';
import { Icon } from '../components/icons';
import { AuthShell, AuthCardHead, AuthField } from '../components/AuthShell';

const PASSWORD_RULE = 'Use at least 10 characters, including a letter and a number.';

function checkStrength(value) {
  if (value.length < 10 || !/[a-z]/i.test(value) || !/[0-9]/.test(value)) return PASSWORD_RULE;
  return '';
}

export default function ResetPassword() {
  usePageMeta({
    title: 'Choose a new password · The Centre for Transformation',
    description: 'Complete your password recovery by choosing a new password for your member account.',
    path: '/reset-password',
  });

  const [params, setSearchParams] = useSearchParams();
  const token = params.get('token') || '';
  const [returnSearch] = useState(() => recoveryAuthSearch(params.toString()));

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const pending = useRef(false);

  const submit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    const strength = checkStrength(password);
    if (strength) { setError(strength); return; }
    if (confirm !== password) { setError('Passwords do not match.'); return; }

    pending.current = true;
    setSubmitting(true);
    setError('');
    try {
      await apiRequest('/auth/password/reset', { method: 'POST', body: { token, password } });
      setDone(true);
      // The link is spent; drop the token from the address bar and history.
      clearRecoveryIntent();
      setSearchParams(new URLSearchParams(returnSearch), { replace: true });
    } catch (failure) {
      setError(failure.code === 'reset_link_invalid'
        ? 'That link no longer works. It may have been used or has expired, request a new one.'
        : failure.message || 'We could not update your password. Please try again.');
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      image="/images/photos/mountain-sit.webp"
      eyebrow="Account Recovery"
      lead="Choose a new password. When it is saved, every other device signing in with the old password is signed out."
      titleLead="Choose a "
      titleAccent="New Password"
    >
      <AuthCardHead title={done ? 'Password updated' : 'Set a new password'} sub={done ? 'Sign in with it to continue.' : 'This link proves who you are, so it works only once.'} />

      {done ? (
        <div className="au-note">
          <Icon name="check" size={18} />
          <p>
            <b>Your new password is live</b>
            <span>We also emailed you a confirmation. If you did not request this change, reply to that email straight away.</span>
          </p>
        </div>
      ) : !token ? (
        <div className="au-note">
          <Icon name="info" size={18} />
          <p>
            <b>This link is incomplete</b>
            <span>Reset links arrive with a code attached. Request a new one and open it from your email.</span>
          </p>
        </div>
      ) : (
        <form className="au-fields" onSubmit={submit} aria-busy={submitting}>
          <AuthField id="au-password" label="New Password" icon="lock">
            <input
              id="au-password"
              type={show ? 'text' : 'password'}
              name="password"
              autoComplete="new-password"
              placeholder="At least 10 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={10}
              pattern="(?=.*[A-Za-z])(?=.*[0-9]).{10,}"
              title={PASSWORD_RULE}
              disabled={submitting}
              required
            />
            <button
              type="button"
              className="au-eye"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
              aria-pressed={show}
            >
              <Icon name={show ? 'eyeOff' : 'eye'} size={17} />
            </button>
          </AuthField>

          <AuthField id="au-confirm" label="Confirm New Password" icon="lock">
            <input
              id="au-confirm"
              type={show ? 'text' : 'password'}
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Repeat it exactly"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={submitting}
              required
            />
          </AuthField>

          {error ? <p className="au-err" role="alert">{error}</p> : null}

          <button type="submit" className="au-submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save new password →'}
          </button>
        </form>
      )}

      <div className="au-rowline">
        <Link className="au-forgot" to={authLink(done ? '/login' : '/forgot-password', returnSearch)}>
          {done ? 'Go to sign in' : 'Request a new link'}
        </Link>
        {done ? <Link className="au-forgot" to="/">Return to the site</Link> : null}
      </div>
    </AuthShell>
  );
}
