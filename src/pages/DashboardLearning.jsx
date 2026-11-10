import { useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import CoursePlayer from '../components/CoursePlayer';
import { CourseTile, DashIcon, EmptyState, PageHeading, RequestState, money, useDashboardResource } from '../components/DashboardUI';

const courseCommunityText = {
  'the-mind-life-transformation-collection': {
    name: 'Mind & Life Collection',
    sections: [
      {
        title: 'What You\'ll Get From Mind & Life Collection',
        intro: 'As a student, you\'ll get a few great benefits from being here:',
        items: [
          { heading: 'Access exclusive content.', text: 'We\'ve designed Mind & Life Collection to inspire, instruct, and engage.' },
          { heading: 'Meet new people.', text: 'Your fellow students are as motivated as you are to master what we\'re exploring here in Mind & Life Collection.' },
          { heading: 'Get results.', text: 'As you dive into the course content and meet the community here in Mind & Life Collection, you\'re on a path of mastery. While it\'s not necessarily easy, the transformation we\'ll get together matters.' }
        ]
      },
      {
        title: 'How to Get the Most Out of Mind & Life Collection',
        intro: 'We\'re here to get results and we know you are too. Here\'s the best way for each of us to get there:',
        items: [
          { heading: 'Be supportive.', text: 'Encourage and support your fellow students. No one here is looking for your criticism, cynicism, advice, or judgement. (We can get those things on the rest of the Internet).' },
          { heading: 'Share generously.', text: 'Your stories and experiences may be exactly what another student needs to hear today to solve a problem or seize an opportunity.' },
          { heading: 'Be constructive.', text: 'We\'re here to push each other forward and lift each other up. Find ways to help each other think bigger, reframe challenges, and stay curious.' },
          { heading: 'Don\'t spam, promote, or troll.', text: 'Mind & Life Collection exists to help you learn. It\'s not a place to spam, promote, or bully anyone else.' }
        ]
      },
      {
        title: 'You\'re a Part of Something Bigger',
        intro: 'By joining Mind & Life Collection, you\'re also a member of The Centre for Transformation, our overarching community. You\'ll be able to keep up with our Mind & Life Collection activity both here, but also in your main The Centre for Transformation Activity Feed (think about it as our own Facebook newsfeed with Course and other activity all in one place).',
        closing: 'Let\'s get started.'
      }
    ]
  },
  '10-part-consciousness-accelerator': {
    name: '10-Part Consciousness Accelerator',
    sections: [
      {
        title: 'What You\'ll Get From 10-Part Consciousness Accelerator',
        intro: 'As a student, you\'ll get a few great benefits from being here:',
        items: [
          { heading: 'Access exclusive content.', text: 'We\'ve designed 10-Part Consciousness Accelerator to inspire, instruct, and engage.' },
          { heading: 'Meet new people.', text: 'Your fellow students are as motivated as you are to master what we\'re exploring here in 10-Part Consciousness Accelerator.' },
          { heading: 'Get results.', text: 'As you dive into the course content and meet the community here in 10-Part Consciousness Accelerator, you\'re on a path of mastery. While it\'s not necessarily easy, the transformation we\'ll get together matters.' }
        ]
      },
      {
        title: 'How to Get the Most Out of 10-Part Consciousness Accelerator',
        intro: 'We\'re here to get results and we know you are too. Here\'s the best way for each of us to get there:',
        items: [
          { heading: 'Be supportive.', text: 'Encourage and support your fellow students. No one here is looking for your criticism, cynicism, advice, or judgement. (We can get those things on the rest of the Internet).' },
          { heading: 'Share generously.', text: 'Your stories and experiences may be exactly what another student needs to hear today to solve a problem or seize an opportunity.' },
          { heading: 'Be constructive.', text: 'We\'re here to push each other forward and lift each other up. Find ways to help each other think bigger, reframe challenges, and stay curious.' },
          { heading: 'Don\'t spam, promote, or troll.', text: '10-Part Consciousness Accelerator exists to help you learn. It\'s not a place to spam, promote, or bully anyone else.' }
        ]
      },
      {
        title: 'You\'re a Part of Something Bigger',
        intro: 'By joining 10-Part Consciousness Accelerator, you\'re also a member of The Centre for Transformation, our overarching community. You\'ll be able to keep up with our 10-Part Consciousness Accelerator activity both here, but also in your main The Centre for Transformation Activity Feed (think about it as our own Facebook newsfeed with Course and other activity all in one place).',
        closing: 'Let\'s get started.'
      }
    ]
  },
  'spiritual-awakening-1': {
    name: 'Spiritual Awakening 1',
    sections: [
      {
        title: 'What You\'ll Get From Spiritual Awakening 1',
        intro: 'As a student, you\'ll get a few great benefits from being here:',
        items: [
          { heading: 'Access exclusive content.', text: 'We\'ve designed Spiritual Awakening 1 to inspire, instruct, and engage.' },
          { heading: 'Meet new people.', text: 'Your fellow students are as motivated as you are to master what we\'re exploring here in Spiritual Awakening 1.' },
          { heading: 'Get results.', text: 'As you dive into the course content and meet the community here in Spiritual Awakening 1, you\'re on a path of mastery. While it\'s not necessarily easy, the transformation we\'ll get together matters.' }
        ]
      },
      {
        title: 'How to Get the Most Out of Spiritual Awakening 1',
        intro: 'We\'re here to get results and we know you are too. Here\'s the best way for each of us to get there:',
        items: [
          { heading: 'Be supportive.', text: 'Encourage and support your fellow students. No one here is looking for your criticism, cynicism, advice, or judgement. (We can get those things on the rest of the Internet).' },
          { heading: 'Share generously.', text: 'Your stories and experiences may be exactly what another student needs to hear today to solve a problem or seize an opportunity.' },
          { heading: 'Be constructive.', text: 'We\'re here to push each other forward and lift each other up. Find ways to help each other think bigger, reframe challenges, and stay curious.' },
          { heading: 'Don\'t spam, promote, or troll.', text: 'Spiritual Awakening 1 exists to help you learn. It\'s not a place to spam, promote, or bully anyone else.' }
        ]
      },
      {
        title: 'You\'re a Part of Something Bigger',
        intro: 'By joining Spiritual Awakening 1, you\'re also a member of The Centre for Transformation, our overarching community. You\'ll be able to keep up with our Spiritual Awakening 1 activity both here, but also in your main The Centre for Transformation Activity Feed (think about it as our own Facebook newsfeed with Course and other activity all in one place).',
        closing: 'Let\'s get started.'
      }
    ]
  },
  'spiritual-awakening-2': {
    name: 'Spiritual Awakening 2',
    sections: [
      {
        title: 'What You\'ll Get From Spiritual Awakening 2',
        intro: 'As a student, you\'ll get a few great benefits from being here:',
        items: [
          { heading: 'Access exclusive content.', text: 'We\'ve designed Spiritual Awakening 2 to inspire, instruct, and engage.' },
          { heading: 'Meet new people.', text: 'Your fellow students are as motivated as you are to master what we\'re exploring here in Spiritual Awakening 2.' },
          { heading: 'Get results.', text: 'As you dive into the course content and meet the community here in Spiritual Awakening 2, you\'re on a path of mastery. While it\'s not necessarily easy, the transformation we\'ll get together matters.' }
        ]
      },
      {
        title: 'How to Get the Most Out of Spiritual Awakening 2',
        intro: 'We\'re here to get results and we know you are too. Here\'s the best way for each of us to get there:',
        items: [
          { heading: 'Be supportive.', text: 'Encourage and support your fellow students. No one here is looking for your criticism, cynicism, advice, or judgement. (We can get those things on the rest of the Internet).' },
          { heading: 'Share generously.', text: 'Your stories and experiences may be exactly what another student needs to hear today to solve a problem or seize an opportunity.' },
          { heading: 'Be constructive.', text: 'We\'re here to push each other forward and lift each other up. Find ways to help each other think bigger, reframe challenges, and stay curious.' },
          { heading: 'Don\'t spam, promote, or troll.', text: 'Spiritual Awakening 2 exists to help you learn. It\'s not a place to spam, promote, or bully anyone else.' }
        ]
      },
      {
        title: 'You\'re a Part of Something Bigger',
        intro: 'By joining Spiritual Awakening 2, you\'re also a member of The Centre for Transformation, our overarching community. You\'ll be able to keep up with our Spiritual Awakening 2 activity both here, but also in your main The Centre for Transformation Activity Feed (think about it as our own Facebook newsfeed with Course and other activity all in one place).',
        closing: 'Let\'s get started.'
      }
    ]
  },
  'the-complete-awakening-consciousness-transformation-program': {
    name: 'Awakening & Consciousness Program',
    sections: [
      {
        title: 'What You\'ll Get From Awakening & Consciousness Program',
        intro: 'As a student, you\'ll get a few great benefits from being here:',
        items: [
          { heading: 'Access exclusive content.', text: 'We\'ve designed Awakening & Consciousness Program to inspire, instruct, and engage.' },
          { heading: 'Meet new people.', text: 'Your fellow students are as motivated as you are to master what we\'re exploring here in Awakening & Consciousness Program.' },
          { heading: 'Get results.', text: 'As you dive into the course content and meet the community here in Awakening & Consciousness Program, you\'re on a path of mastery. While it\'s not necessarily easy, the transformation we\'ll get together matters.' }
        ]
      },
      {
        title: 'How to Get the Most Out of Awakening & Consciousness Program',
        intro: 'We\'re here to get results and we know you are too. Here\'s the best way for each of us to get there:',
        items: [
          { heading: 'Be supportive.', text: 'Encourage and support your fellow students. No one here is looking for your criticism, cynicism, advice, or judgement. (We can get those things on the rest of the Internet).' },
          { heading: 'Share generously.', text: 'Your stories and experiences may be exactly what another student needs to hear today to solve a problem or seize an opportunity.' },
          { heading: 'Be constructive.', text: 'We\'re here to push each other forward and lift each other up. Find ways to help each other think bigger, reframe challenges, and stay curious.' },
          { heading: 'Don\'t spam, promote, or troll.', text: 'Awakening & Consciousness Program exists to help you learn. It\'s not a place to spam, promote, or bully anyone else.' }
        ]
      },
      {
        title: 'You\'re a Part of Something Bigger',
        intro: 'By joining Awakening & Consciousness Program, you\'re also a member of The Centre for Transformation, our overarching community. You\'ll be able to keep up with our Awakening & Consciousness Program activity both here, but also in your main The Centre for Transformation Activity Feed (think about it as our own Facebook newsfeed with Course and other activity all in one place).',
        closing: 'Let\'s get started.'
      }
    ]
  }
};

function CommunityWelcomeSection({ courseSlug }) {
  const data = courseCommunityText[courseSlug];
  if (!data) return null;
  return (
    <section className="db-community" aria-label={`Community welcome for ${data.name}`}>
      {data.sections.map((section, idx) => (
        <article className="db-panel db-community-card" key={idx}>
          <h3>{section.title}</h3>
          {section.intro && <p>{section.intro}</p>}
          {section.items && (
            <div className="db-community-items">
              {section.items.map((item, itemIdx) => (
                <p key={itemIdx}><strong>{item.heading}</strong> {item.text}</p>
              ))}
            </div>
          )}
          {section.closing && <p className="db-community-closing">{section.closing}</p>}
        </article>
      ))}
    </section>
  );
}

function IntroVideoPlaceholder() {
  return (
    <div style={{ aspectRatio: '16 / 9', width: '100%', background: '#120a24', border: '1px solid #e8b95f', borderRadius: 12, display: 'grid', placeContent: 'center', textAlign: 'center', padding: 24, color: '#fff' }}>
      <p style={{ marginBottom: 8, fontWeight: 600 }}>Intro video coming soon</p>
      <p style={{ opacity: 0.75, fontSize: 13 }}>The welcome video for this program will appear here once it is published.</p>
    </div>
  );
}

export function MyCourses() {
  const resource = useDashboardResource('/student/courses?limit=60');
  const [search, setSearch] = useState('');
  const courses = (resource.data?.courses || []).filter((course) => course.title.toLowerCase().includes(search.toLowerCase()));
  return <div className="db-stack"><PageHeading eyebrow="Your learning library" title="My Courses" action={<Link className="db-button-secondary" to="/dashboard/explore">Explore courses</Link>}>Learn at your own pace. Pick up where you left off.</PageHeading><label className="db-field">Find a course<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your courses" /></label><RequestState resource={resource}>{courses.length ? <div className="db-grid">{courses.map((course) => <CourseTile key={course.id} course={course} owned />)}</div> : <div className="db-panel"><EmptyState icon="book" title={search ? 'No matching courses' : 'Your library starts with one step'} action={<Link className="db-button" to="/dashboard/explore">Explore courses</Link>}>{search ? 'Try another course title.' : 'Your enrolled courses and saved progress will appear here.'}</EmptyState></div>}</RequestState></div>;
}

/**
 * Enrolment always opens on the review page: the offering, its currency and
 * the server-set total are shown there before any payment is started.
 */
function CheckoutButton({ product, kind = 'course' }) {
  const ref = product.slug || product.id;
  const [code, setCode] = useState('');
  return <div className="db-stack">
    <label className="db-field">Discount code (optional)<input aria-label={`Discount code for ${product.title}`} maxLength={40} value={code} placeholder="For example WELCOME10" onChange={(event) => setCode(event.target.value)} /></label>
    <Link className="db-button" to={`/checkout?${kind}=${encodeURIComponent(ref)}${code.trim() ? `&discount=${encodeURIComponent(code.trim().toUpperCase())}` : ''}`}>Review and enrol<DashIcon name="arrow" size={16} /></Link>
  </div>;
}

export function ExplorePrograms() {
  const [params, setParams] = useSearchParams();
  const programs = params.get('tab') === 'programs';
  const [search, setSearch] = useState('');
  const resource = useDashboardResource(programs ? '/programs?limit=60' : '/courses?limit=60');
  const items = (resource.data?.[programs ? 'programs' : 'courses'] || []).filter((item) => item.title.toLowerCase().includes(search.toLowerCase()));
  return <div className="db-stack"><PageHeading eyebrow="Make space for growth" title="All Programs">Explore courses and collections to support your next chapter.</PageHeading><div className="db-actions"><button className={programs ? 'db-button-secondary' : 'db-button'} aria-pressed={!programs} onClick={() => setParams({})}>Courses</button><button className={programs ? 'db-button' : 'db-button-secondary'} aria-pressed={programs} onClick={() => setParams({ tab: 'programs' })}>Programs & collections</button></div><label className="db-field">Search {programs ? 'programs' : 'courses'}<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="What would you like to learn?" /></label><RequestState resource={resource}>{items.length ? <div className="db-grid">{items.map((item) => programs ? <article className="db-panel db-stack" key={item.id}><span className="db-icon-ring"><DashIcon name="lotus" /></span><h2>{item.title}</h2><p className="db-muted">{item.short}</p><p className="db-price">{item.isFree ? 'Free' : money(item.priceMinor, item.currency)}</p><details><summary>Included courses</summary>{item.courses?.length ? item.courses.map((course) => <p key={course.id}><Link className="db-text-link" to={`/dashboard/explore/${encodeURIComponent(course.slug || course.id)}`}>{course.title || 'View course'}</Link></p>) : <p className="db-muted">Course details are not published yet.</p>}</details><CheckoutButton product={item} kind="program" /></article> : <CourseTile key={item.id} course={item} />)}</div> : <div className="db-panel"><EmptyState icon="lotus" title={search ? 'No matches just yet' : 'New possibilities are on their way'}>{search ? 'Try another title or switch categories.' : 'Published learning options will appear here when available.'}</EmptyState></div>}</RequestState></div>;
}

function LessonContent({ lessonId, courseId }) {
  const resource = useDashboardResource(`/student/lessons/${encodeURIComponent(lessonId)}`);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const complete = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { await apiRequest(`/student/lessons/${encodeURIComponent(lessonId)}/complete`, { method: 'POST' }); resource.reload(); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <RequestState resource={resource}>{resource.data && <div className="db-panel db-stack"><h2>{resource.data.lesson.title}</h2><p className="db-muted">{resource.data.lesson.description}</p>{resource.data.lesson.hasVideo ? <CoursePlayer key={lessonId} courseId={courseId} initialLessonId={lessonId} /> : <>{resource.data.lesson.textContent && <div style={{ whiteSpace: 'pre-wrap' }}>{resource.data.lesson.textContent}</div>}{!resource.data.lesson.textContent && <p className="db-muted">No text content is published for this lesson.</p>}</>}<p className="db-muted">Status: {resource.data.progress.status.replaceAll('_', ' ')}</p>{resource.data.progress.status !== 'completed' && <button className="db-button-secondary" disabled={busy} onClick={complete}>{busy ? 'Checking completion…' : 'Mark lesson complete'}</button>}{error && <p className="db-error" role="alert">{error}</p>}</div>}</RequestState>;
}

function CurriculumList({ curriculum, courseSlug, enrolledRoute }) {
  if (!curriculum?.length) return <div className="db-panel"><EmptyState icon="book" title="Curriculum is being prepared">Published modules will appear here when available.</EmptyState></div>;
  // A bundle lists the modules of every course inside it, so each set is labelled
  // with the teaching it belongs to.
  const groups = [];
  for (const module of curriculum) {
    const key = module.courseTitle || '';
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(module);
    else groups.push({ key, items: [module] });
  }
  return <section className="db-stack"><h2>Course curriculum</h2>{groups.map((group) => <div className="db-stack" key={`course-${group.items[0].id}`}>
    {group.key && <h3 className="db-curriculum-course">{group.key}</h3>}
    {group.items.map((module) => <div className="db-panel" key={module.id}><h3>{module.title}</h3>{module.lessons.map((lesson) => <div className="db-actions" key={lesson.id} style={{ padding: '10px 0', justifyContent: 'space-between' }}><span>{lesson.title}</span>{enrolledRoute && !lesson.locked ? <Link className="db-text-link" to={`/dashboard/courses/${encodeURIComponent(courseSlug)}/lesson/${encodeURIComponent(lesson.id)}`}>Open lesson<DashIcon name="arrow" size={15} /></Link> : <span className="db-muted">{lesson.isPreview ? 'Preview lesson' : 'Included with enrollment'}</span>}</div>)}</div>)}
  </div>)}</section>;
}

export function DashboardCourse() {
  const { slug, lessonId } = useParams();
  const { pathname } = useLocation();
  const { owns } = useAuth();
  const enrolledRoute = pathname.startsWith('/dashboard/courses/');
  const resource = useDashboardResource(`/${enrolledRoute ? 'student/courses' : 'courses'}/${encodeURIComponent(slug)}`);
  const [wishMessage, setWishMessage] = useState('');
  const [wishError, setWishError] = useState('');
  const [saving, setSaving] = useState(false);
  const course = resource.data?.course;
  const saveWish = async () => {
    if (saving) return;
    setSaving(true); setWishError(''); setWishMessage('');
    try { await apiRequest('/student/wishlist', { method: 'POST', body: { productKind: 'course', productId: course.id } }); setWishMessage('Saved to your wishlist.'); }
    catch (failure) { setWishError(failure.message); }
    finally { setSaving(false); }
  };
  return <div className="db-stack"><Link className="db-text-link" to={enrolledRoute ? '/dashboard/courses' : '/dashboard/explore'}>Back to {enrolledRoute ? 'my courses' : 'all programs'}</Link><RequestState resource={resource}>{course && <><PageHeading eyebrow={enrolledRoute ? 'Your course' : 'Explore a new path'} title={course.title}>{course.short}</PageHeading>{!enrolledRoute && <div className="db-panel db-stack"><p className="db-price">{course.isFree ? 'Free' : money(course.priceMinor, course.currency)}</p>{owns(course.id) ? <Link className="db-button" to={`/dashboard/courses/${encodeURIComponent(course.slug)}`}>Open my course</Link> : <CheckoutButton product={course} />}<button className="db-button-secondary" disabled={saving} onClick={saveWish}>{saving ? 'Saving…' : 'Save to wishlist'}</button>{wishMessage && <p role="status">{wishMessage}</p>}{wishError && <p className="db-error" role="alert">{wishError}</p>}</div>}{lessonId ? <LessonContent key={lessonId} lessonId={lessonId} courseId={course.id} /> : <>{course.description && <div className="db-panel" style={{ whiteSpace: 'pre-wrap' }}>{course.description}</div>}{enrolledRoute && resource.data.access === 'full' && resource.data.curriculum?.some((module) => module.lessons.some((lesson) => lesson.hasVideo)) && <><CommunityWelcomeSection courseSlug={course.slug} /><CoursePlayer courseId={course.id} /></>}{enrolledRoute && resource.data.access === 'full' && !resource.data.curriculum?.some((module) => module.lessons.some((lesson) => lesson.hasVideo)) && <><CommunityWelcomeSection courseSlug={course.slug} /><IntroVideoPlaceholder /></>}</>}<CurriculumList curriculum={resource.data.curriculum} courseSlug={course.slug} enrolledRoute={enrolledRoute} /></>}</RequestState></div>;
}
