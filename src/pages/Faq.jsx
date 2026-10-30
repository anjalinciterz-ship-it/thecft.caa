import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { faqGroups, faqs } from '../data/faqs';
import FaqAccordion, { faqCategoryIcon } from '../components/FaqAccordion';
import { Icon } from '../components/icons';

const crisis =
  'If you are in crisis, please do not wait for a class. In Canada and the United States, call or text 9-8-8 at any hour of any day to reach the Suicide Crisis Helpline. Outside those countries, please contact your local crisis line. If you are in immediate danger, call emergency services.';

// Pill labels stay short so the filter row reads evenly; group headings keep the full names.
const pillLabel = {
  cft: 'About CFT',
  zalah: 'About Zalah',
  spirituality: 'Spirituality & Practice',
  mental: 'Mental Wellbeing',
  courses: 'Courses & Programs',
  community: 'Free Classes',
  practical: 'Practical Details',
};

export default function Faq() {
  const [cat, setCat] = useState('all');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      faqs.filter(
        (f) =>
          (cat === 'all' || f.category === cat) && (!q || `${f.q} ${f.a.join(' ')}`.toLowerCase().includes(q)),
      ),
    [cat, q],
  );

  const activeGroup = faqGroups.find((g) => g.key === cat);

  function resetFilters() {
    setCat('all');
    setQuery('');
  }

  return (
    <>
      <section className="fq-band fq-hero">
        <div className="container">
          <nav className="fq-crumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>FAQs</span>
          </nav>
          <p className="faq-eyebrow">
            <span className="faq-rule" aria-hidden="true" />
            Questions &amp; Answers
            <span className="faq-rule" aria-hidden="true" />
          </p>
          <h1 className="faq-title fq-title">
            Find the <span>Clarity You’re Looking For</span>
          </h1>
          <p className="fq-lead">
            Explore answers to common questions about spirituality, consciousness, our programs, and your journey with
            CFT.
          </p>
        </div>
      </section>

      <section className="fq-band fq-tools">
        <div className="container fq-col">
          <div className="fq-search">
            <Icon name="search" size={19} />
            <label className="sr-only" htmlFor="fq-search">
              Search questions and answers
            </label>
            <input
              id="fq-search"
              type="search"
              placeholder={`Search ${faqs.length} questions and answers…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button type="button" className="fq-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <span aria-hidden="true">×</span>
              </button>
            )}
          </div>

          <div className="fq-cats" role="group" aria-label="Filter questions by category">
            <button
              type="button"
              className={`fq-pill${cat === 'all' ? ' active' : ''}`}
              aria-pressed={cat === 'all'}
              onClick={() => setCat('all')}
            >
              All Questions
            </button>
            {faqGroups.map((g) => (
              <button
                key={g.key}
                type="button"
                className={`fq-pill${cat === g.key ? ' active' : ''}`}
                aria-pressed={cat === g.key}
                onClick={() => setCat(g.key)}
              >
                {pillLabel[g.key] || g.title}
              </button>
            ))}
          </div>

          <p className="fq-count" role="status" aria-live="polite">
            Showing {filtered.length} of {faqs.length} questions
            {activeGroup ? ` in ${activeGroup.title}` : ''}
          </p>
        </div>
      </section>

      <section className="fq-band fq-main">
        <div className="container fq-col">
          {faqGroups.map((g) => {
            const items = filtered.filter((f) => f.category === g.key);
            if (!items.length) return null;
            return (
              <div className="fq-group" key={g.key} id={`fq-${g.key}`}>
                <div className="fq-group-head">
                  <h2>{g.title}</h2>
                  <p>{g.sub}</p>
                </div>
                <div className="fq-group-list">
                  {items.map((f, i) => (
                    <FaqAccordion
                      key={f.q}
                      id={`faq-${g.key}-${i}`}
                      question={f.q}
                      answer={f.a}
                      icon={faqCategoryIcon[g.key]}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {!filtered.length && (
            <div className="fq-empty">
              <span className="fq-empty-ico" aria-hidden="true">
                <Icon name="search" size={24} />
              </span>
              <h2>No questions match your search</h2>
              <p>
                {q ? (
                  <>
                    Nothing matched “<strong>{query.trim()}</strong>”
                    {activeGroup ? ` in ${activeGroup.title}` : ''}.{' '}
                  </>
                ) : (
                  <>There are no questions in this category yet. </>
                )}
                Try a different word, browse every category, or ask us directly and we’ll point you the right way.
              </p>
              <div className="fq-empty-actions">
                <button type="button" className="btn btn-gold" onClick={resetFilters}>
                  Clear Filters
                </button>
                <Link to="/connect" className="btn btn-ghost">
                  Contact Us
                </Link>
              </div>
            </div>
          )}

          <aside className="fq-crisis">
            <span className="fq-crisis-ico" aria-hidden="true">
              <Icon name="heart" size={20} />
            </span>
            <div>
              <h2>A note about mental health &amp; wellbeing</h2>
              <p>{crisis}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="fq-band fq-close">
        <div className="container">
          <div className="fq-close-panel">
            <div>
              <h2>Still have questions?</h2>
              <p>We’re here to help you find your next step.</p>
            </div>
            <Link to="/connect" className="btn btn-gold">
              Contact Us <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
