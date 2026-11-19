/* The navbar panels are the only thing that needs the whole FAQ, book, blog and
   testimonial lists on the landing page, and they open on a hover rather than on
   a paint. In their own chunk they hold that data off the critical path; Header
   starts the fetch once the page has loaded, so an intentional hover still
   finds them ready. */
import { Link } from 'react-router-dom';
import { site } from '../data/site';
import { useCatalog } from '../lib/catalog';
import { books } from '../data/books';
import { blogCategories } from '../data/blog';
import { faqGroups, faqs } from '../data/faqs';
import { testimonials } from '../data/testimonials';
import { Icon } from './icons';

/* A preview line has to stay inside one panel row, so quotes are cut at the
   last whole word and the trailing punctuation goes with them. */
const clip = (text, max = 150) =>
  text.length <= max ? text : `${text.slice(0, text.lastIndexOf(' ', max)).replace(/[,.;:—-]\s*$/, '')}…`;

/* One shape for all seven panels: a title, at most one line of context, the
   destinations and one action that opens the page itself. They were full-bleed
   mega menus carrying photographs and course tiles, which hid the page the
   visitor was reading, so the extra fields are gone. */
function MenuPanel({ title, note, noteBy, links, cta, twoUp }) {
  return (
    <div className="mm-compact">
      <p className="mm-title">{title}</p>
      {note ? (
        <p className="mm-note">
          {note}
          {noteBy ? <span className="mm-note-by">{noteBy}</span> : null}
        </p>
      ) : null}
      <div className={`mm-list${twoUp ? ' mm-list-two' : ''}`}>
        {links.map((l) =>
          l.href ? (
            <a key={l.label} href={l.href} target={l.external ? '_blank' : undefined} rel="noreferrer" className="mm-item">
              {l.label}
              <span className="mm-item-arrow" aria-hidden="true">
                →
              </span>
            </a>
          ) : (
            <Link key={l.label} to={l.to} className="mm-item">
              {l.label}
              <span className="mm-item-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ),
        )}
      </div>
      <Link to={cta.to} className="mm-all">
        {cta.label}
        <Icon name="arrow" size={13} />
      </Link>
    </div>
  );
}

function MenuAbout() {
  return (
    <MenuPanel
      title={site.name}
      note={clip(site.mission, 118)}
      links={[
        { to: '/testimonials', label: 'Testimonials' },
        { to: '/faq', label: 'FAQs' },
        { to: '/connect', label: 'Connect Us' },
      ]}
      cta={{ to: '/about#story', label: 'Read our story' }}
    />
  );
}

function MenuCourses() {
  const { offerings } = useCatalog();
  return (
    <MenuPanel
      twoUp
      title="The teachings"
      links={offerings.filter((c) => c.listed !== false).map((c) => ({ to: `/course/${c.id}`, label: c.name }))}
      cta={{ to: '/courses', label: 'All programs' }}
    />
  );
}

function MenuBooks() {
  return (
    <MenuPanel
      title="The books"
      links={books.map((b) => ({ to: `/books/${b.slug}`, label: b.title }))}
      cta={{ to: '/books', label: 'Browse all books' }}
    />
  );
}

function MenuBlog() {
  return (
    <MenuPanel
      twoUp
      title="The blog"
      links={blogCategories.map((c) => ({ to: c.key === 'all' ? '/blog' : `/blog?cat=${c.key}`, label: c.label }))}
      cta={{ to: '/blog', label: 'Read the latest' }}
    />
  );
}

function MenuTestimonials() {
  const [first] = testimonials;
  return (
    <MenuPanel
      title="What students say"
      note={`“${clip(first.lead, 108)}”`}
      noteBy={first.name}
      links={[
        { to: '/testimonials#t-stories', label: 'Stories from the community' },
        { to: '/connect', label: 'Share your own story' },
      ]}
      cta={{ to: '/testimonials', label: 'Read every story' }}
    />
  );
}

function MenuFaqs() {
  return (
    <MenuPanel
      twoUp
      title="Questions"
      links={faqGroups.map((g) => ({ to: `/faq#fq-${g.key}`, label: g.title }))}
      cta={{ to: '/faq', label: `All ${faqs.length} questions` }}
    />
  );
}

function MenuConnect() {
  return (
    <MenuPanel
      title="Talk with us"
      links={[
        { to: '/connect#cn-form', label: 'Send us a message' },
        { to: '/connect#cn-wisdom', label: 'Join the Wednesday Wisdom Class' },
        { href: site.calendly, external: true, label: 'Book a call' },
        { href: `mailto:${site.email}`, label: site.email },
      ]}
      cta={{ to: '/connect', label: 'See all ways to connect' }}
    />
  );
}

export default function HeaderMenus({ menu }) {
  const panels = {
    about: <MenuAbout />,
    courses: <MenuCourses />,
    books: <MenuBooks />,
    blog: <MenuBlog />,
    testimonials: <MenuTestimonials />,
    faq: <MenuFaqs />,
    connect: <MenuConnect />,
  };
  return panels[menu] || null;
}
