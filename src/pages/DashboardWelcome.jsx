import { Link } from 'react-router-dom';
import { DashIcon, MemberHero, NextCard, RuleHead } from '../components/DashboardUI';

// Comp 2026-11-06 (1): the starting point for a member who owns nothing yet.
// /dashboard sends them here; once they own a program it sends them to the
// member home instead.
export default function DashboardWelcome() {
  return (
    <div className="db-home db-stack">
      <MemberHero
        eyebrow="Welcome to CFT"
        title="Welcome to the CFT Community."
        tag="A beautiful journey begins with a single step."
        lead="We’re glad you’re here. Explore transformative programs, meaningful teachings and resources to support your growth and awakening."
        actions={
          <>
            <Link className="db-button-plum" to="/dashboard/explore"><DashIcon name="play" size={15} />Explore Programs</Link>
            <Link className="db-button-outline" to="/books"><DashIcon name="book" size={16} />Read Books</Link>
          </>
        }
      />

      <section>
        <RuleHead title="Discover What’s Next" sub="Explore programs and resources designed for your journey of transformation." />
        <div className="db-next-grid">
          <NextCard icon="play" tone="lavender" title="Explore Programs" text="Transformative courses and immersive learning experiences." to="/dashboard/explore" label="Browse Programs" />
          <NextCard icon="book" tone="gold" title="Read Books" text="Explore Zalah’s books and related resources." to="/books" label="Go to Books" />
          <NextCard icon="calendar" tone="lavender" title="Join an Event" text="Attend live sessions like the Wednesday Wisdom Call and more." to="/dashboard/calls?tab=classes" label="View Events" />
        </div>
      </section>
    </div>
  );
}
