import { Link } from 'react-router-dom';
import CourseBanner from './CourseBanner';
import { Icon } from './icons';
import { OfferingPrice } from '../lib/catalog';

/* Compact program tile used for the homepage selection and related rails.
   The title is the single stretched link so the whole card stays clickable
   with an accessible name equal to the course name. */
export default function CourseCard({ course }) {
  return (
    <article className="cq-card">
      <CourseBanner course={course} />
      <div className="cq-card-body">
        <span className="cq-chip">{course.level}</span>
        <h3 className="cq-card-title">
          <Link to={`/course/${course.id}`}>{course.name}</Link>
        </h3>
        <p className="cq-card-short">{course.short}</p>
        <div className="cq-card-foot">
          <OfferingPrice offering={course} />
          <span className="cq-card-cta" aria-hidden="true">
            Explore Course <Icon name="arrow" size={15} />
          </span>
        </div>
      </div>
    </article>
  );
}
