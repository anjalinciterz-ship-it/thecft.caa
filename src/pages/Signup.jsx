import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { authDestination, authLink } from '../lib/authNavigation';
import { usePageMeta } from '../lib/seo';
import { Icon } from '../components/icons';
import GoogleSignIn from '../components/GoogleSignIn';
import OtpForm from '../components/OtpForm';
import { AuthShell, AuthCardHead, AuthOr } from '../components/AuthShell';

export default function Signup() {
  usePageMeta({ title: 'Create Your Account · The Centre for Transformation', description: 'Create your account with a verified email, mobile number, or Google.', path: '/signup' });
  const { loading, isAuthed } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const destination = authDestination(search);
  const [channel, setChannel] = useState('email');
  const [googleConsent, setGoogleConsent] = useState(false);
  useEffect(() => { if (isAuthed && !loading) navigate(destination, { replace: true }); }, [isAuthed, loading, navigate, destination]);
  const land = () => navigate(destination, { replace: true });

  return <AuthShell image="/images/photos/fog-pier.webp" eyebrow="Begin Your Journey" titleLead="Create Your" titleAccent="Account" lead="A little space for learning, reflection and growth. Start with your email or mobile number, no password required.">
    <AuthCardHead eyebrow="Create Your Account" title="Get Started" sub="Verify your email or mobile number to begin." />
    {destination !== '/dashboard' && <p className="au-method-notice">Your selected course will be waiting after registration.</p>}
    <div className="au-methods au-methods-two" role="group" aria-label="Registration method">
      {[['email', 'Email code', 'mail'], ['sms', 'Mobile code', 'phone']].map(([value, label, icon]) => <button key={value} type="button" aria-pressed={channel === value} disabled={loading} onClick={() => setChannel(value)}><Icon name={icon} size={18} /><span>{label}</span></button>)}
    </div>
    <OtpForm key={channel} channel={channel} purpose="signup" onDone={land} />
    <p className="au-session">Prefer a password? You can add one and choose a username after verifying your account.</p>
    <AuthOr />
    <label className="au-check"><input type="checkbox" checked={googleConsent} onChange={(event) => setGoogleConsent(event.target.checked)} /><span className="box" aria-hidden="true"><Icon name="check" size={12} /></span><span>To continue with Google, I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.</span></label>
    <GoogleSignIn disabled={!googleConsent} onDone={land} />
    <p className="au-foot">Already have an account? <Link to={authLink('/login', search)}>Log in</Link></p>
  </AuthShell>;
}
