import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { authDestination, authLink, clearRecoveryIntent, recoveryAuthSearch } from '../lib/authNavigation';
import { usePageMeta } from '../lib/seo';
import { Icon } from '../components/icons';
import { AuthShell, AuthCardHead } from '../components/AuthShell';

const failureCopy = (code) => {
  if (code === 'link_expired') return 'This sign-in link has expired. Request a new one and open it within ten minutes.';
  if (code === 'link_used') return 'This link was already used. Request a new one if you are not signed in.';
  if (code === 'invalid_link') return 'That link is not one we issued. Request a new one from the sign-in page.';
  if (code === 'account_not_found') return 'The account for that address could not be found. Create one to continue.';
  return 'We could not sign you in with that link. Please request a new one.';
};

/**
 * The far half of a magic link: the mail's token arrives here, is spent against
 * the API, and the member lands where they were headed. The post is automatic
 * because that is what "one click" means, and it is started once per mount
 * because a spent link cannot be re-read.
 */
export default function MagicLink() {
  usePageMeta({
    title: 'Signing you in · The Centre for Transformation',
    description: 'Completing the one-click sign-in link sent to your email address.',
    path: '/magic-link',
  });

  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [returnSearch] = useState(() => recoveryAuthSearch(params.toString()));
  const { verifyMagicLink } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState(token ? 'working' : 'incomplete');
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const started = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!token || started.current) return undefined;
    started.current = true;
    verifyMagicLink(token)
      .then(() => {
        if (!mounted.current) return;
        clearRecoveryIntent();
        navigate(authDestination(returnSearch), { replace: true });
      })
      .catch((failure) => {
        if (!mounted.current) return;
        setStage('failed');
        setError(failureCopy(failure.code));
      });
    return undefined;
  }, [token, verifyMagicLink, navigate, returnSearch]);

  return (
    <AuthShell
      image="/images/photos/mountain-sit.webp"
      eyebrow="Welcome Back"
      titleLead="Signing You"
      titleAccent="In"
      lead="Open the link from the email it arrived in, on the device you want to keep signed in."
    >
      <AuthCardHead
        title={stage === 'working' ? 'One moment…' : stage === 'failed' ? 'That link did not work' : 'Link incomplete'}
        sub={stage === 'working' ? 'We are confirming the link you just opened.' : 'A sign-in link carries a code with it. Request a new one and open it from your email.'}
      />

      {stage === 'working' ? (
        <div className="au-note" role="status">
          <Icon name="mail" size={18} />
          <p>
            <b>Confirming your sign-in link</b>
            <span>This happens automatically. Keep the page open while we check it.</span>
          </p>
        </div>
      ) : null}

      {stage === 'failed' ? (
        <>
          <p className="au-err" role="alert">{error}</p>
          <p className="au-session">You can ask for a fresh link, or sign in another way with an email code, a mobile code or your password.</p>
        </>
      ) : null}

      {stage === 'incomplete' ? (
        <div className="au-note">
          <Icon name="info" size={18} />
          <p>
            <b>Nothing to confirm</b>
            <span>This page only works when it is opened from the sign-in link in your email.</span>
          </p>
        </div>
      ) : null}

      {stage !== 'working' ? (
        <div className="au-rowline">
          <Link className="au-forgot" to={authLink('/login', returnSearch)}>Request a new link</Link>
          <Link className="au-forgot" to="/">Return to the site</Link>
        </div>
      ) : null}
    </AuthShell>
  );
}
