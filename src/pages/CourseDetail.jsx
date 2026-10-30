import { Link, useParams } from 'react-router-dom';
import { getCourse, includeLabel, includeLink } from '../data/courses';
import { OfferingPrice, findOffering, useCatalog } from '../lib/catalog';
import { useAuth } from '../lib/auth';
import CoursePlayer from '../components/CoursePlayer';
import { Icon } from '../components/icons';
import CourseBanner from '../components/CourseBanner';
import CourseCard from '../components/CourseCard';
import CourseFaqs from '../components/CourseFaqs';
import { usePageMeta, courseJsonLd } from '../lib/seo';
import NotFound from './NotFound';

export default function CourseDetail() {
  const { id } = useParams();
  const { offerings } = useCatalog();
  /* The server row wins for price, currency and lesson counts; the shipped
     content still renders the page when the catalog API is unreachable. */
  const course = findOffering(offerings, id) || getCourse(id);
  const { user, owns } = useAuth();

  usePageMeta(
    course
      ? {
          title: course.seo.title,
          description: course.seo.desc,
          path: `/course/${course.id}`,
          jsonLd: courseJsonLd(course),
        }
      : { title: 'Course not found — CFT by Zalah' },
  );

  if (!course) return <NotFound />;

  const unlocked = owns(course.id);
  const modules = course.curriculum || [];
  const lessons = modules.flatMap((m) => m.items);
  const included = course.includedOfferings || course.bundleIncludes || [];
  const related = offerings
    .filter((c) => c.id !== course.id && (c.categories || []).some((k) => (course.categories || []).includes(k)))
    .slice(0, 3);

  // Counts come from what is actually published once the offering lives in the
  // database; marketing copy keeps its own outline until then.
  const publishedModules = Number(course.publishedModuleCount);
  const publishedLessons = Number(course.publishedLessonCount);
  const fromServer = Number.isFinite(publishedModules) && Number.isFinite(publishedLessons) && publishedLessons > 0;
  const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const contents = course.productKind === 'program'
    ? { k: 'Contents', v: `${included.length} included teachings` }
    : fromServer
      ? { k: 'Modules', v: `${count(publishedModules, 'module')} · ${count(publishedLessons, 'lesson')}` }
      : modules.length
        ? { k: 'Modules', v: `${modules.length} modules · ${lessons.length} sessions` }
        : { k: 'Contents', v: `${included.length} included teachings` };

  const structure = [
    { k: 'Level', v: course.level },
    { k: 'Format', v: course.length },
    course.tag ? { k: 'Pathway', v: course.tag } : null,
    contents,
    course.id === 'accelerator' ? { k: 'Practice', v: 'A guided exercise with every lesson' } : null,
    course.id === 'accelerator' ? { k: 'Live Q&A', v: 'Two recorded Q&A sessions with Zalah' } : null,
    { k: 'Access', v: 'Access terms are listed in My Courses after enrolment' },
  ].filter(Boolean);

  return (
    <>
      <section className="cq-band cq-lav cq-post-hero">
        <div className="container">
          <nav className="cq-crumb cq-crumb-left" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <Link to="/courses">Courses</Link>
            <span aria-hidden="true">/</span>
            <span>{course.name}</span>
          </nav>
          <div className="cq-post-grid">
            <div className="cq-post-copy">
              <div className="cq-chips">
                <span className="cq-chip">{course.level}</span>
                <span className="cq-chip">{course.length}</span>
                {course.tag && <span className="cq-chip">{course.tag}</span>}
                {unlocked && <span className="cq-chip cq-chip-gold">Enrolled</span>}
              </div>
              <h1 className="cq-post-title">{course.name}</h1>
              <p className="cq-post-dek">{course.short}</p>
              <p className="cq-price cq-price-lg">
                <OfferingPrice offering={course} className="" />
              </p>
              <div className="cq-show-cta">
                {unlocked ? (
                  <Link to={`/dashboard/courses/${encodeURIComponent(course.slug)}`} className="btn btn-gold">
                    Open course
                    <Icon name="arrow" size={16} />
                  </Link>
                ) : (
                  <Link to={`/checkout?course=${encodeURIComponent(course.id)}`} className="btn btn-gold">
                    Enroll Now
                    <Icon name="arrow" size={16} />
                  </Link>
                )}
                <a href="#purpose" className="btn btn-ghost">
                  Explore the Program
                </a>
              </div>
            </div>
            <div className="cq-post-art">
              <CourseBanner course={course} loading="eager" />
            </div>
          </div>
        </div>
      </section>

      {unlocked && user && <CoursePlayer courseId={course.id} />}

      <section id="purpose" className="cq-band cq-white">
        <div className="container cq-col">
          <span className="cq-eyebrow">
            <i className="rule" aria-hidden="true" />
            The Purpose
            <i className="rule" aria-hidden="true" />
          </span>
          <h2 className="cq-h2">What This Program Is For</h2>
          <p className="cq-body">{course.description}</p>
          {course.outcome && <p className="cq-body">{course.outcome}</p>}
        </div>
      </section>

      <section className="cq-band cq-ivory">
        <div className="container cq-col">
          <span className="cq-eyebrow">
            <i className="rule" aria-hidden="true" />
            A Good Fit
            <i className="rule" aria-hidden="true" />
          </span>
          <h2 className="cq-h2">Who This Course Is For</h2>
          <ul className="cq-outcomes cq-outcomes-lg">
            {(course.whoFor || []).map((w) => (
              <li key={w}>
                <Icon name="lotus" size={16} />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cq-band cq-white">
        <div className="container cq-col">
          <span className="cq-eyebrow">
            <i className="rule" aria-hidden="true" />
            Curriculum
            <i className="rule" aria-hidden="true" />
          </span>
          <h2 className="cq-h2">What You Will Learn</h2>
          {modules.length ? (
            <div className="cq-mods">
              {modules.map((m, i) => (
                <div className="cq-mod" key={m.title}>
                  <h3>
                    <span className="cq-mod-num" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {m.title}
                  </h3>
                  <ul>
                    {m.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : included.length ? (
            <div className="cq-mods">
              {included.map((item) => {
                const ref = typeof item === 'string' ? item : item.id;
                const label = typeof item === 'string' ? includeLabel(ref) : item.name;
                const to = typeof item === 'string' ? includeLink(ref) : `/course/${encodeURIComponent(item.slug || item.id)}`;
                return (
                  <div className="cq-mod" key={ref}>
                    <h3>{label}</h3>
                    <p>
                      {to ? (
                        <>
                          Also available as its own program —{' '}
                          <Link to={to}>view {label}</Link>.
                        </>
                      ) : (
                        'A standalone teaching inside this collection.'
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="cq-enrol-note">Every lesson opens inside the course as soon as you are enrolled.</p>
          )}
        </div>
      </section>

      <section className="cq-band cq-lav">
        <div className="container cq-col">
          <span className="cq-eyebrow">
            <i className="rule" aria-hidden="true" />
            Structure
            <i className="rule" aria-hidden="true" />
          </span>
          <h2 className="cq-h2">How the Program Runs</h2>
          <dl className="cq-facts">
            {structure.map((s) => (
              <div className="cq-fact" key={s.k}>
                <dt>{s.k}</dt>
                <dd>{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="cq-band cq-white">
        <div className="container cq-col">
          <span className="cq-eyebrow">
            <i className="rule" aria-hidden="true" />
            Included
            <i className="rule" aria-hidden="true" />
          </span>
          <h2 className="cq-h2">What Is Included</h2>
          <ul className="cq-outcomes cq-outcomes-lg">
            {course.productKind !== 'program' && (modules.length || fromServer) ? (
              <>
                <li>
                  <Icon name="film" size={16} />
                  <span>
                    {fromServer
                      ? `${count(publishedLessons, 'published lesson')} across ${count(publishedModules, 'module')}`
                      : `${lessons.length} recorded sessions across ${modules.length} modules`}
                  </span>
                </li>
                {course.id === 'accelerator' && (
                  <li>
                    <Icon name="pencil" size={16} />
                    <span>A guided exercise with every lesson</span>
                  </li>
                )}
                {course.id === 'accelerator' && (
                  <li>
                    <Icon name="mic" size={16} />
                    <span>Two recorded Q&amp;A sessions with Zalah</span>
                  </li>
                )}
                {course.id !== 'accelerator' && (
                  <li>
                    <Icon name="mic" size={16} />
                    <span>Recorded live class teachings from the School format</span>
                  </li>
                )}
              </>
            ) : (
              included.map((item) => {
                const ref = typeof item === 'string' ? item : item.id;
                return (
                  <li key={ref}>
                    <Icon name="book" size={16} />
                    <span>{typeof item === 'string' ? includeLabel(ref) : item.name}</span>
                  </li>
                );
              })
            )}
          </ul>
          {course.bonus && (
            <p className="cq-bonus">
              <Icon name="gift" size={17} /> {course.bonus}
            </p>
          )}
        </div>
      </section>

      <section className="cq-band cq-ivory">
        <div className="container cq-col">
          <span className="cq-eyebrow">
            <i className="rule" aria-hidden="true" />
            Questions
            <i className="rule" aria-hidden="true" />
          </span>
          <h2 className="cq-h2">Frequently Asked Questions</h2>
          <CourseFaqs faqs={course.faqs} />
        </div>
      </section>

      {related.length > 0 && (
        <section className="cq-band cq-white cq-related">
          <div className="container">
            <span className="cq-eyebrow">
              <i className="rule" aria-hidden="true" />
              Keep Exploring
              <i className="rule" aria-hidden="true" />
            </span>
            <h2 className="cq-h2">Related Programs</h2>
            <div className="cq-grid">
              {related.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="cq-band cq-plum cq-enrol">
        <div className="container cq-enrol-box">
          <div>
            <h2 className="cq-h2">{course.name}</h2>
            <p className="cq-price cq-price-lg">
              <OfferingPrice offering={course} className="" />
            </p>
            <p className="cq-enrol-note">Enrolment is handled securely on this site — your course opens in My Courses.</p>
          </div>
          <div className="cq-enrol-cta">
            {unlocked ? (
              <Link to={`/dashboard/courses/${encodeURIComponent(course.slug)}`} className="btn btn-gold">
                Open course
                <Icon name="arrow" size={16} />
              </Link>
            ) : (
              <Link to={`/checkout?course=${encodeURIComponent(course.id)}`} className="btn btn-gold">
                Enroll Now
                <Icon name="arrow" size={16} />
              </Link>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
