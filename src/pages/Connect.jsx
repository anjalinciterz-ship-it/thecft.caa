import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { site } from '../data/site';
import { Eyebrow } from '../components/ui';
import { Icon } from '../components/icons';
import { BookCallCta, NextCallNotice, WisdomCallCta } from '../components/ScheduleCta';
import { useNextWisdomCall } from '../lib/schedule';

const subjects = site.contactSubjects;

const PATHS = [
  {
    icon: 'chat',
    title: 'Ask a Question',
    text: 'Course details, the Wisdom Class, technical help or anything else, write to us and we’ll answer personally.',
    href: '#cn-form',
    cta: 'Open the form',
  },
  {
    icon: 'bulb',
    title: 'Join Wednesday Wisdom',
    text: 'A free live class every Wednesday at 7:00 PM (MT). Reserve a place and receive the joining details by email.',
    kind: 'wisdom',
    cta: 'Reserve a place',
  },
  {
    icon: 'calendar',
    title: 'Book a Call',
    text: 'Prefer to talk it through? Choose a time for a complimentary one-on-one introductory call with Zalah.',
    kind: 'bookings',
    cta: 'Choose a time',
  },
];

/**
 * The pathways point at the platform's own schedule, where the free Wednesday
 * class and a paid appointment sit side by side, so choosing either one lands on
 * the same published calendar.
 */
function PathCta({ path, next }) {
  if (path.kind === 'wisdom') {
    return (
      <WisdomCallCta next={next} className="cn-path-cta">
        {path.cta}
      </WisdomCallCta>
    );
  }
  if (path.kind === 'bookings') {
    return (
      <BookCallCta className="cn-path-cta">
        {path.cta}
      </BookCallCta>
    );
  }
  return (
    <a className="cn-path-cta" href={path.href}>
      {path.cta} →
    </a>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ContactForm() {
  const [values, setValues] = useState({ first: '', last: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const [formError, setFormError] = useState('');
  const pending = useRef(false);
  const submission = useRef(null);

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!values.first.trim()) e.first = 'Please enter your first name.';
    if (!values.last.trim()) e.last = 'Please enter your last name.';
    if (!EMAIL_RE.test(values.email.trim())) e.email = 'Please enter a valid email address.';
    if (!values.subject) e.subject = 'Please choose a subject.';
    if (values.message.trim().length < 10) e.message = 'Please tell us a little more (at least 10 characters).';
    return e;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    if (pending.current) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setFormError('Please fix the highlighted fields and try again.');
      return;
    }
    const body = { name: `${values.first.trim()} ${values.last.trim()}`, email: values.email.trim(), subject: values.subject, message: values.message.trim() };
    const signature = JSON.stringify(body);
    if (submission.current?.signature !== signature) submission.current = { signature, key: crypto.randomUUID() };
    setFormError(''); setStatus('sending'); pending.current = true;
    try {
      await apiRequest('/contact', { method: 'POST', body, headers: { 'Idempotency-Key': submission.current.key } });
      setStatus('sent');
    } catch (error) { setFormError(error.message); setStatus('idle'); }
    finally { pending.current = false; }
  };

  if (status === 'sent') {
    return (
      <div className="cn-sent" role="status">
        <span className="cn-sent-ico" aria-hidden="true">
          <span className="gdot" />
        </span>
        <h3>Thank you, {values.first.trim()}.</h3>
        <p>Your message is with the CFT team. We usually respond within 24–48 hours.</p>
        <button
          type="button"
          className="btn btn-ghost btn-sm cn-again"
          onClick={() => {
            submission.current = null;
            setValues({ first: '', last: '', email: '', subject: '', message: '' });
            setErrors({});
            setFormError('');
            setStatus('idle');
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  const field = (key, label, node) => (
    <div className="form-field">
      <label htmlFor={`cn-${key}`}>{label}</label>
      {node}
      {errors[key] ? (
        <p className="cn-err" id={`cn-${key}-err`}>
          {errors[key]}
        </p>
      ) : null}
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="form-row">
        {field(
          'first',
          'First Name *',
          <input
            id="cn-first"
            name="first"
            placeholder="John"
            value={values.first}
            onChange={set('first')}
            required
            autoComplete="given-name"
            aria-invalid={!!errors.first}
            aria-describedby={errors.first ? 'cn-first-err' : undefined}
          />
        )}
        {field(
          'last',
          'Last Name *',
          <input
            id="cn-last"
            name="last"
            placeholder="Doe"
            value={values.last}
            onChange={set('last')}
            required
            autoComplete="family-name"
            aria-invalid={!!errors.last}
            aria-describedby={errors.last ? 'cn-last-err' : undefined}
          />
        )}
      </div>
      {field(
        'email',
        'Email Address *',
        <input
          id="cn-email"
          name="email"
          type="email"
          placeholder="john@example.com"
          value={values.email}
          onChange={set('email')}
          required
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'cn-email-err' : undefined}
        />
      )}
      {field(
        'subject',
        'Subject *',
        <select
          id="cn-subject"
          name="subject"
          value={values.subject}
          onChange={set('subject')}
          required
          aria-invalid={!!errors.subject}
          aria-describedby={errors.subject ? 'cn-subject-err' : undefined}
        >
          <option value="" disabled>
            Select a subject
          </option>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      )}
      {field(
        'message',
        'Your Message *',
        <textarea
          id="cn-message"
          name="message"
          rows={5}
          placeholder="Type your message here..."
          value={values.message}
          onChange={set('message')}
          required
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'cn-message-err' : undefined}
        />
      )}

      {formError ? (
        <p className="cn-form-err" role="alert">
          {formError}
        </p>
      ) : null}

      <button type="submit" className="btn btn-gold btn-block" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send Message →'}
      </button>
      <p className="cn-fine">We read every message and usually respond within 24–48 hours.</p>
    </form>
  );
}

export default function Connect() {
  const { next } = useNextWisdomCall();
  return (
    <>
      {/* ---------- Hero ---------- */}
      <header className="cn-hero">
        <div className="container">
          <Eyebrow>Let’s Start a Kinder, Brighter Tomorrow</Eyebrow>
          <h1>
            Every meaningful journey begins with <span>a conversation.</span>
          </h1>
          <p>
            Whether you have a question, want to explore a program, or simply want to connect, we’re here to help you
            find your next step.
          </p>
          <div className="cn-hero-actions">
            <a className="btn btn-gold" href="#cn-form">
              Send Us a Message <Icon name="arrow" size={16} />
            </a>
            <a className="btn cn-ghost" href="#cn-wisdom">
              Join Wednesday Wisdom
            </a>
          </div>
        </div>
      </header>

      {/* ---------- Pathways ---------- */}
      <section className="cn-paths">
        <div className="container">
          <h2 className="cn-paths-title">How would you like to connect?</h2>
          <div className="cn-path-grid">
            {PATHS.map((p) => (
              <article className="cn-path" key={p.title}>
                <span className="cn-path-ico" aria-hidden="true">
                  <span className="gdot" />
                </span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
                <PathCta path={p} next={next} />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Wednesday Wisdom ---------- */}
      <section className="cn-wisdom" id="cn-wisdom">
        <div className="container">
          <div className="cn-wisdom-card">
            <figure className="cn-poster">
              <img
                src={site.wisdomClass.image}
                alt="Wednesday Free Wisdom Call poster with Zalah, every Wednesday, 7:00 PM Mountain Time"
                width="1024"
                height="683"
              />
            </figure>
            <div className="cn-wisdom-copy">
              <Eyebrow>Every Week, Free</Eyebrow>
              <h2>{site.wisdomClass.title}</h2>
              <p>{site.wisdomClass.blurb}</p>
              <ul className="cn-schedule">
                <li>
                  <Icon name="calendar" size={18} />
                  <span>
                    <em>Day</em>
                    <b>Every Wednesday</b>
                  </span>
                </li>
                <li>
                  <Icon name="clock" size={18} />
                  <span>
                    <em>Time</em>
                    <b>7:00 PM Mountain Time</b>
                  </span>
                </li>
                <li>
                  <Icon name="gift" size={18} />
                  <span>
                    <em>Price</em>
                    <b>Free · open to all</b>
                  </span>
                </li>
              </ul>
              <WisdomCallCta next={next}>Reserve My Place</WisdomCallCta>
              <NextCallNotice next={next} className="cn-published" />
              <p className="cn-fine">Come as you are, no preparation needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Form + booking ---------- */}
      <section className="cn-form" id="cn-form">
        <div className="container">
          <div className="cn-form-grid">
            <div className="cn-card">
              <h2>Send Us a Message</h2>
              <p className="cn-card-lead">
                Tell us what’s on your mind and the CFT team will get back to you personally.
              </p>
              <ContactForm />
            </div>

            <div className="cn-side">
              <div className="cn-card cn-info">
                <h3>Get In Touch</h3>
                <ul>
                  <li>
                    <Icon name="mail" size={18} />
                    <span>
                      <em>Email &amp; Phone</em>
                      <b className="cn-contact-line">
                        <a href={`mailto:${site.email}`}>{site.email}</a>
                        <i aria-hidden="true">·</i>
                        <a href={`tel:${site.phone.replace(/[^0-9]/g, '')}`}>{site.phone}</a>
                      </b>
                    </span>
                  </li>
                  <li>
                    <Icon name="pin" size={18} />
                    <span>
                      <em>Location</em>
                      <b>
                        {site.address.line1}, {site.address.line2}
                      </b>
                    </span>
                  </li>
                </ul>
              </div>

              <div className="cn-card cn-talk">
                <img src={site.portrait} alt="Zalah, founder of The Centre for Transformation" loading="lazy" />
                <h3>Let’s Talk</h3>
                <p>Book a complimentary one-on-one introductory call with Zalah to discuss your journey.</p>
                <BookCallCta className="btn btn-gold btn-sm">Book a call</BookCallCta>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Closing CTA (global footer follows, rendered once) ---------- */}
      <section className="cn-cta">
        <div className="container">
          <h2>
            Ready when you are. <span>Take the first step.</span>
          </h2>
          <p>Explore the teachings, or join us live on Wednesday, whichever feels right for today.</p>
          <div className="cn-cta-row">
            <Link to="/courses" className="btn btn-gold">
              Explore CFT
            </Link>
            <Link to="/wisdom-call" className="btn cn-ghost">
              Wednesday Wisdom Class
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
