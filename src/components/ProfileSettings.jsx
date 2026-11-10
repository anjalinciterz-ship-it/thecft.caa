import { useState } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import OtpForm from './OtpForm';

export default function ProfileSettings({ profile, action }) {
  const { user, refreshSession } = useAuth();
  const current = user?.id === profile.id ? user : profile;
  const [form, setForm] = useState({ name: profile.name || '', username: profile.username || '', timeZone: profile.timeZone || 'America/Denver' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [verification, setVerification] = useState(null);
  const [verified, setVerified] = useState(false);
  const zones = [...new Set([form.timeZone, 'UTC', ...Intl.supportedValuesOf('timeZone')])];
  const startVerification = (purpose = 'link') => { setVerification({ purpose }); setVerified(false); };
  const saveProfile = (event) => {
    event.preventDefault();
    action.run(async () => {
      await apiRequest('/users/me', { method: 'PATCH', body: { ...form, username: form.username.trim() || undefined } });
      await refreshSession();
    }, 'Your profile has been saved.');
  };
  const savePassword = (event) => {
    event.preventDefault();
    action.run(async () => {
      if (password.newPassword !== password.confirm) throw new Error('The new passwords do not match.');
      await apiRequest('/users/me/password', { method: 'POST', body: { ...(current.hasPassword ? { currentPassword: password.currentPassword } : {}), newPassword: password.newPassword } });
      setPassword({ currentPassword: '', newPassword: '', confirm: '' });
      await refreshSession();
    }, 'Your password has been updated.');
  };
  return <>
    <form className="db-panel db-form" onSubmit={saveProfile}>
      <h2>Your profile</h2>
      <label className="db-field">Full name<input required maxLength={120} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
      <label className="db-field">Username (optional)<input autoComplete="username" minLength={3} maxLength={30} pattern="[A-Za-z][A-Za-z0-9_]{2,29}" title="3–30 letters, numbers or underscores; begin with a letter." value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value.toLowerCase() })} /><span className="db-muted">A unique handle for your account. Signing in always uses your email address.</span></label>
      <label className="db-field">Time zone<select aria-label="Time zone" value={form.timeZone} onChange={(event) => setForm({ ...form, timeZone: event.target.value })}>{zones.map((zone) => <option key={zone}>{zone}</option>)}</select></label>
      <button className="db-button" disabled={action.busy}>Save profile</button>
    </form>
    <section className="db-panel db-stack db-panel-narrow" aria-labelledby="sign-in-methods">
      <h2 id="sign-in-methods">Sign-in methods</h2>
      <p className="db-muted">Your courses stay in this account. Verify a new email address here instead of creating another account.</p>
      <div><strong>Email</strong><p>{current.email || 'No email added'} · {current.emailVerified ? 'Verified' : 'Not verified'}</p><button type="button" className="db-button-secondary" onClick={() => startVerification()}>{current.emailVerified ? 'Change email' : current.email ? 'Verify email' : 'Add email'}</button></div>
      <details><summary>Confirm a recent sign-in</summary><p className="db-muted">For sensitive changes, you may need to verify your email again.</p><div className="db-actions">{current.email && <button type="button" className="db-button-secondary" onClick={() => startVerification('login')}>Confirm by email</button>}</div></details>
      {verification && <div className="db-stack"><h3>{verification.purpose === 'login' ? 'Confirm your identity' : 'Verify your email'}</h3><OtpForm key={`${current.id}-${verification.purpose}-${verification.purpose === 'login' ? current.email : ''}`} purpose={verification.purpose} fixedDestination={verification.purpose === 'login' ? current.email : ''} onDone={() => { setVerification(null); setVerified(true); }} /><button className="db-text-link" type="button" onClick={() => setVerification(null)}>Close verification</button></div>}
      {verified && <p role="status">Verification complete.</p>}
    </section>
    <form className="db-panel db-form" onSubmit={savePassword}>
      <h2>{current.hasPassword ? 'Change password' : 'Set an optional password'}</h2>
      <p className="db-muted">With a password, you can sign in using your email address.</p>
      {[...(current.hasPassword ? [['currentPassword', 'Current password']] : []), ['newPassword', 'New password'], ['confirm', 'Confirm new password']].map(([key, label]) => <label className="db-field" key={key}>{label}<input type="password" autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'} required minLength={key === 'currentPassword' ? 1 : 10} maxLength={200} value={password[key]} onChange={(event) => setPassword({ ...password, [key]: event.target.value })} /></label>)}
      <p className="db-muted">Use at least 10 characters, including a letter and a number. Setting your first password requires a recent verification code.</p>
      <button className="db-button-secondary" disabled={action.busy}>{current.hasPassword ? 'Update password' : 'Set password'}</button>
    </form>
  </>;
}
