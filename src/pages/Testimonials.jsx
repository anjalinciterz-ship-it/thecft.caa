import { Link } from 'react-router-dom';
import { testimonials, coursePageTestimonials } from '../data/testimonials';
import { site } from '../data/site';
import TestimonialCard from '../components/TestimonialCard';
import { Eyebrow } from '../components/ui';

const all = [...testimonials, ...coursePageTestimonials];

export default function Testimonials() {
  return (
    <>
      <header className="ts-hero">
        <div className="container">
          <Eyebrow>Stories of Growth &amp; Transformation</Eyebrow>
          <h1>
            Real People. <span>Real Transformations.</span>
          </h1>
          <p>
            In their own words — what students have experienced through the classes, courses and retreats at The Centre
            for Transformation. Select any story to read the complete message, exactly as it was shared.
          </p>
          <span className="ts-rule" aria-hidden="true" />
          <a className="ts-jump" href="#t-stories">
            Read the stories below ↓
          </a>
        </div>
      </header>

      <section className="ts-stories" id="t-stories">
        <div className="container">
          <div className="t-wall">
            {all.map((t) => (
              <TestimonialCard key={t.name} t={t} />
            ))}
          </div>
        </div>
      </section>

      <section className="ts-cta">
        <div className="container text-center">
          <h2>
            Maybe Your Next Step Is Simply <span>to Begin.</span>
          </h2>
          <p>
            You don’t have to know exactly where your journey is going. Start with curiosity. Start with one question.
            Start with one conversation.
          </p>
          <div className="ts-cta-row">
            <Link to="/courses" className="btn btn-gold">
              Explore CFT
            </Link>
            <Link to="/courses" className="btn btn-ghost">
              Join Our Community
            </Link>
            <Link to="/connect" className="btn btn-ghost">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
