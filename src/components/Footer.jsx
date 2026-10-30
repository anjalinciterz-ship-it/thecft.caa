import { Link } from 'react-router-dom';
import { site } from '../data/site';
import { Icon } from './icons';

// Columns mirror the reference footer layout, but every entry is a page or
// action this site actually has.
const COLS = [
  {
    head: 'About',
    links: [
      { to: '/about', label: 'About Us' },
      { to: '/testimonials', label: 'Testimonials' },
      { to: '/blog', label: 'Insights & Blog' },
      { to: '/faq', label: 'FAQs' },
    ],
  },
  {
    head: 'Programs',
    links: [
      { to: '/courses', label: 'All Courses' },
      { to: '/course/accelerator', label: 'Consciousness Accelerator' },
      { to: '/course/sa1', label: 'Spiritual Awakening I' },
      { to: '/course/complete', label: 'The Complete Path' },
      { to: '/books', label: 'Books by Zalah' },
    ],
  },
  {
    head: 'Account',
    links: [
      { to: '/login', label: 'Sign In' },
      { to: '/signup', label: 'Register' },
      { to: '/dashboard', label: 'Dashboard' },
    ],
  },
  {
    head: 'Connect',
    links: [
      { to: '/connect', label: 'Contact Us' },
      { to: '/wisdom-call', label: 'Wednesday Wisdom Class' },
      { to: '/courses', label: 'CFT Community' },
      { to: '/dashboard/calls?tab=bookings', label: 'Book a Call' },
    ],
  },
  {
    head: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/terms', label: 'Terms of Service' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="ft-cols">
        {COLS.map((col) => (
          <div key={col.head} className="ft-col">
            <h4>{col.head}</h4>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link to={l.to}>{l.label}</Link>
                  ) : (
                    <a href={l.href} target="_blank" rel="noreferrer">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="ft-col ft-follow">
          <h4>Follow Us</h4>
          <div className="ft-socials">
            {site.socials.map((s) => (
              <a
                key={s.key}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                title={`${s.label} ${s.handle}`}
                aria-label={s.label}
              >
                <Icon name={s.icon} size={22} />
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="ft-bottom">
        <div className="ft-bottom-in">
          <img className="ft-logo" src={site.logoColor} alt={site.name} />
          <span className="ft-made">Made by Vaibhav</span>
          <span className="ft-copy">© {new Date().getFullYear()}. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
