import { useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import CoursePlayer from '../components/CoursePlayer';
import { CourseTile, DashIcon, EmptyState, PageHeading, RequestState, money, useDashboardResource } from '../components/DashboardUI';

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
  return <div className="db-stack"><Link className="db-text-link" to={enrolledRoute ? '/dashboard/courses' : '/dashboard/explore'}>Back to {enrolledRoute ? 'my courses' : 'all programs'}</Link><RequestState resource={resource}>{course && <><PageHeading eyebrow={enrolledRoute ? 'Your course' : 'Explore a new path'} title={course.title}>{course.short}</PageHeading>{!enrolledRoute && <div className="db-panel db-stack"><p className="db-price">{course.isFree ? 'Free' : money(course.priceMinor, course.currency)}</p>{owns(course.id) ? <Link className="db-button" to={`/dashboard/courses/${encodeURIComponent(course.slug)}`}>Open my course</Link> : <CheckoutButton product={course} />}<button className="db-button-secondary" disabled={saving} onClick={saveWish}>{saving ? 'Saving…' : 'Save to wishlist'}</button>{wishMessage && <p role="status">{wishMessage}</p>}{wishError && <p className="db-error" role="alert">{wishError}</p>}</div>}{lessonId ? <LessonContent key={lessonId} lessonId={lessonId} courseId={course.id} /> : <>{course.description && <div className="db-panel" style={{ whiteSpace: 'pre-wrap' }}>{course.description}</div>}{enrolledRoute && resource.data.access === 'full' && resource.data.curriculum?.some((module) => module.lessons.some((lesson) => lesson.hasVideo)) && <CoursePlayer courseId={course.id} />}</>}<section className="db-stack"><h2>Course curriculum</h2>{resource.data.curriculum?.length ? resource.data.curriculum.map((module) => <div className="db-panel" key={module.id}><h3>{module.title}</h3>{module.lessons.map((lesson) => <div className="db-actions" key={lesson.id} style={{ padding: '10px 0', justifyContent: 'space-between' }}><span>{lesson.title}</span>{enrolledRoute && !lesson.locked ? <Link className="db-text-link" to={`/dashboard/courses/${encodeURIComponent(course.slug)}/lesson/${encodeURIComponent(lesson.id)}`}>Open lesson<DashIcon name="arrow" size={15} /></Link> : <span className="db-muted">{lesson.isPreview ? 'Preview lesson' : 'Included with enrollment'}</span>}</div>)}</div>) : <div className="db-panel"><EmptyState icon="book" title="Curriculum is being prepared">Published modules will appear here when available.</EmptyState></div>}</section></>}</RequestState></div>;
}
