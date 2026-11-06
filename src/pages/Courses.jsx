import { useState } from 'react';
import { Link } from 'react-router-dom';
import { categoryLabel } from '../data/courses';
import { OfferingPrice, findOffering, useCatalog } from '../lib/catalog';
import { site } from '../data/site';
import CourseShowcase from '../components/CourseShowcase';
import CourseBanner from '../components/CourseBanner';
import { Icon } from '../components/icons';
import { NextCallNotice, WisdomCallCta } from '../components/ScheduleCta';
import { useNextWisdomCall } from '../lib/schedule';
import { usePageMeta } from '../lib/seo';

const GUIDANCE_OPTIONS = [
  { label: 'A gentle daily start', id: 'accelerator' },
  { label: 'A library of practical teachings', id: 'mindlife' },
  { label: 'The first stage of deep awakening work', id: 'sa1' },
  { label: 'To go deeper after beginning that work', id: 'sa2' },
  { label: 'Everything, in one complete path', id: 'complete' },
];

function Compare() {
  const { offerings } = useCatalog();
  const rows = offerings.filter((c) => c.listed !== false);
  return (
    <section id="compare" className="cq-band cq-white cq-compare">
      <div className="container">
        <span className="cq-eyebrow">
          Choose Your Path
        </span>
        <h2 className="cq-h2">Compare the Five Programs</h2>
        <div className="cq-table" role="table" aria-label="Comparison of the five CFT programs">
          <div className="cq-tr cq-head" role="row">
            <span role="columnheader">Program</span>
            <span role="columnheader">Level</span>
            <span role="columnheader">Primary focus</span>
            <span role="columnheader">Format</span>
            <span role="columnheader">Price</span>
            <span role="columnheader" className="cq-tr-cta">
              <span className="sr-only">Course page</span>
            </span>
          </div>
          {rows.map((c) => (
            <div className="cq-tr" role="row" key={c.id}>
              <span role="cell" data-label="Program">
                <Link to={`/course/${c.id}`} className="cq-tr-name">
                  {c.name}
                </Link>
              </span>
              <span role="cell" data-label="Level">
                {c.level}
              </span>
              <span role="cell" data-label="Primary focus">
                {(c.categories || []).map((k) => categoryLabel(k)).join(' · ')}
              </span>
              <span role="cell" data-label="Format">
                {c.length}
              </span>
              <span role="cell" data-label="Price" className="cq-price">
                <OfferingPrice offering={c} className="" />
              </span>
              <span role="cell" className="cq-tr-cta">
                <Link to={`/course/${c.id}`} className="cq-tr-link">
                  View course <Icon name="arrow" size={14} />
                </Link>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Guidance() {
  const [stage, setStage] = useState(null); // null | 'flow' | course id
  const { offerings } = useCatalog();
  const course = stage && stage !== 'flow' ? findOffering(offerings, stage) : null;
  return (
    <section id="guidance" className="cq-band cq-lav cq-guide">
      <div className="container cq-guide-box">
        <h2 className="cq-h2">Not Sure Which Course Is Right for You?</h2>
        <p className="cq-lead">
          Every journey is different. Explore the programs to find the learning path that best fits your interests and
          goals.
        </p>
        {!stage && (
          <button type="button" className="btn btn-gold" onClick={() => setStage('flow')}>
            Get Guidance
            <Icon name="arrow" size={16} />
          </button>
        )}
        {stage === 'flow' && (
          <div className="cq-guide-flow">
            <p className="cq-guide-q">What are you looking for right now?</p>
            <div className="cq-guide-opts">
              {GUIDANCE_OPTIONS.map((o) => (
                <button key={o.id} type="button" className="cq-pill" onClick={() => setStage(o.id)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {course && (
          <div className="cq-guide-result">
            <div className="cq-guide-art">
              <CourseBanner course={course} />
            </div>
            <div className="cq-guide-body">
              <span className="cq-num" aria-hidden="true">
                A suggested starting point
              </span>
              <h3>{course.name}</h3>
              <p>{course.short}</p>
              <p className="cq-price">
                <OfferingPrice offering={course} className="" /> · {course.level} · {course.length}
              </p>
              <div className="cq-show-cta">
                <Link to={`/course/${course.id}`} className="btn btn-gold">
                  Explore Course
                  <Icon name="arrow" size={16} />
                </Link>
                <button type="button" className="cq-guide-again" onClick={() => setStage('flow')}>
                  Start over
                </button>
              </div>
              <p className="cq-guide-note">
                This is a starting suggestion based on how each program is positioned, not a professional or
                psychological assessment.{' '}
                <Link to="/connect">Prefer to talk it through? Book a call with Zalah.</Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function WisdomBand() {
  const w = site.wisdomClass;
  const { next } = useNextWisdomCall();
  return (
    <section className="cq-band cq-ivory cq-wisdom">
      <div className="container cq-wisdom-box">
        <div>
          <span className="cq-eyebrow">
            Free Weekly Class
          </span>
          <h2 className="cq-h2">{w.title}</h2>
          <p className="cq-wisdom-when">
            {w.cadence} · {w.when}
          </p>
          <p className="cq-lead">{w.blurb}</p>
          <NextCallNotice next={next} className="cq-wisdom-when" />
        </div>
        <WisdomCallCta next={next}>Reserve Your Free Spot</WisdomCallCta>
      </div>
    </section>
  );
}

export default function Courses() {
  const { offerings } = useCatalog();
  usePageMeta({
    title: 'Courses & Transformation, CFT by Zalah',
    description:
      'Explore five thoughtfully designed programs to deepen your awareness, cultivate inner peace, and create a more meaningful, purposeful life.',
    path: '/courses',
  });

  return (
    <>
      <section className="cq-band cq-lav cq-hero">
        <div className="container">
          <nav className="cq-crumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Courses</span>
          </nav>
          <span className="cq-eyebrow">
            COURSES &amp; TRANSFORMATION
          </span>
          <h1 className="cq-title">
            Transform Your Life With <span>Practical Wisdom</span>
          </h1>
          <p className="cq-lead">
            Explore five thoughtfully designed programs to deepen your awareness, cultivate inner peace, and create a
            more meaningful, purposeful life.
          </p>
          <div className="cq-hero-cta">
            <a href="#programs" className="btn btn-gold">
              Explore Programs
              <Icon name="arrow" size={16} />
            </a>
            <a href="#guidance" className="btn btn-ghost">
              Find Your Path
            </a>
          </div>
        </div>
      </section>

      <div id="programs">
        {offerings.filter((c) => c.listed !== false).map((c, i) => (
          <CourseShowcase key={c.id} course={c} index={i} />
        ))}
      </div>

      <Compare />
      <Guidance />
      <WisdomBand />

      <section className="cq-band cq-plum">
        <div className="container cq-col">
          <span className="cq-eyebrow">
            Your Next Step
          </span>
          <h2 className="cq-h2">Wherever You Are, There Is a Way Deeper.</h2>
          <p className="cq-lead">
            Choose the program that meets you where you are today, or begin with the free Wednesday Wisdom Class and see
            how the work feels before committing to anything.
          </p>
          <div className="cq-hero-cta">
            <a href="#programs" className="btn btn-gold">
              Explore Programs <Icon name="arrow" />
            </a>
            <Link to="/connect" className="btn btn-ghost">
              Talk to Us First
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
