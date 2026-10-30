import { Link } from 'react-router-dom';
import CourseBanner from './CourseBanner';
import { Icon } from './icons';
import { OfferingPrice } from '../lib/catalog';
import { useAuth } from '../lib/auth';

/* Editorial split showcase: full uncropped official banner on one side,
   real headings / outcomes / price / CTAs on the other. Surfaces alternate
   ivory, white, lavender, with one Cosmic Plum section for emphasis. */
const SURFACES = ['cq-ivory', 'cq-white', 'cq-lav', 'cq-plum', 'cq-ivory'];

export default function CourseShowcase({ course, index }) {
  const imgLeft = index % 2 === 0;
  const { isAuthed, owns } = useAuth();
  const owned = owns(course.id);
  return (
    <section id={`program-${course.id}`} className={`cq-band cq-show ${SURFACES[index % SURFACES.length]}`}>
      <div className="container cq-show-grid">
        <div className={imgLeft ? 'cq-show-art' : 'cq-show-art cq-flip'}>
          <CourseBanner course={course} loading={index === 0 ? 'eager' : 'lazy'} />
        </div>
        <div className="cq-show-body">
          <span className="cq-num" aria-hidden="true">
            {course.num ? `Program ${course.num}` : 'Program'}
          </span>
          <h2 className="cq-show-title">{course.name}</h2>
          <p className="cq-show-short">{course.short}</p>
          <ul className="cq-outcomes">
            {(course.outcomes || []).map((o) => (
              <li key={o}>
                <Icon name="lotus" size={15} />
                <span>{o}</span>
              </li>
            ))}
          </ul>
          <div className="cq-chips">
            <span className="cq-chip">{course.level}</span>
            <span className="cq-chip">{course.length}</span>
            {course.tag && <span className="cq-chip">{course.tag}</span>}
          </div>
          <div className="cq-show-cta">
            <Link to={`/course/${course.id}`} className="btn btn-gold">
              Explore Course
              <Icon name="arrow" size={16} />
            </Link>
            {owned ? (
              <Link to={course.slug ? `/dashboard/courses/${encodeURIComponent(course.slug)}` : '/dashboard/courses'} className="btn btn-ghost">
                Open My Courses
              </Link>
            ) : isAuthed ? (
              <Link to={`/checkout?course=${encodeURIComponent(course.id)}`} className="btn btn-ghost">
                Enroll Now
              </Link>
            ) : (
              <Link to={`/signup?course=${course.id}`} className="btn btn-ghost">
                Enroll Now
              </Link>
            )}
            <OfferingPrice offering={course} />
          </div>
        </div>
      </div>
    </section>
  );
}
