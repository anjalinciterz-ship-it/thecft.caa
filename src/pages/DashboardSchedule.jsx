import { useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dayIn, timeIn } from '../lib/schedule';
import { DashIcon, EmptyState, PageHeading, RequestState, dateTime, money, useDashboardResource } from '../components/DashboardUI';
import { site } from '../data/site';

function meetingLink(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && (url.hostname === 'zoom.us' || url.hostname.endsWith('.zoom.us') || url.hostname === 'zoom.com' || url.hostname.endsWith('.zoom.com')) ? url.href : null; }
  catch { return null; }
}
function useScheduleAction() {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [message, setMessage] = useState('');
  const run = async (callback, success = '') => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setErrorCode(''); setMessage('');
    try { await callback(); setMessage(success); }
    catch (failure) { setError(failure.message || 'This action could not be completed.'); setErrorCode(failure.code || ''); }
    finally { pending.current = false; setBusy(false); }
  };
  return { busy, error, errorCode, message, run };
}
function Feedback({ action }) {
  const location = useLocation();
  return <>{action.error && <p className="db-error" role="alert">{action.error}</p>}{action.errorCode === 'email_required' && <Link className="db-text-link" to={`/dashboard/settings?verifyEmail=1&next=${encodeURIComponent(location.pathname + location.search)}`}>Add and verify your email</Link>}{action.message && <p role="status">{action.message}</p>}</>;
}

const WISDOM_CALL_SERIES = 'wednesday_wisdom_call';

const monthOf = (value, timeZone) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', ...(timeZone ? { timeZone } : {}) }).format(new Date(value));

/**
 * The Wednesday call repeats on a rule the server works out, so the dates here
 * are whatever is still to come in the current month and roll over on their own.
 */
export function UpcomingEvents() {
  const resource = useDashboardResource(`/student/live-classes?scope=upcoming&limit=100&series=${WISDOM_CALL_SERIES}`);
  const groups = [];
  for (const item of resource.data?.liveClasses || []) {
    const key = monthOf(item.startAt, item.timeZone);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }
  return <section className="db-stack">
    <div className="db-section-title"><h2>Upcoming events</h2></div>
    <RequestState resource={resource}>{groups.length ? groups.map((group) => <div className="db-stack" key={group.key}>
      <h3 className="db-event-month">{group.key}</h3>
      <div className="db-grid">{group.items.map((item) => <article className="db-panel db-stack db-event-card" key={item.id}>
        <span className="db-icon-ring"><DashIcon name="calendar" size={24} /></span>
        <h3>{item.title}</h3>
        <p className="db-event-when">{dayIn(item.startAt, item.timeZone)}</p>
        <p className="db-muted">{timeIn(item.startAt, item.timeZone)} · Free, live on Zoom</p>
        <a className="db-button" href={site.calendly} target="_blank" rel="noreferrer">Register</a>
      </article>)}</div>
    </div>) : <div className="db-panel"><EmptyState icon="calendar" title="The next month’s dates arrive on their own">Every Wednesday call still to come this month is listed here. When the month turns, the new dates appear.</EmptyState></div>}</RequestState>
  </section>;
}

export function LiveClasses({ inHub = false } = {}) {
  const [scope, setScope] = useState('upcoming');
  const [page, setPage] = useState(1);
  // The recurring Wisdom Call is listed on its own above the tabs, so this view
  // is for everything else and never shows the same date twice.
  const resource = useDashboardResource(`/student/live-classes?scope=${scope}&page=${page}&limit=20&excludeSeries=${WISDOM_CALL_SERIES}`);
  const action = useScheduleAction();
  const [joinLinks, setJoinLinks] = useState({});
  const register = (item) => action.run(async () => { await apiRequest(`/student/live-classes/${encodeURIComponent(item.id)}/register`, { method: item.isRegistered ? 'DELETE' : 'POST' }); resource.reload(); }, item.isRegistered ? 'Registration cancelled.' : 'You are registered for this class.');
  const join = (item) => action.run(async () => { const result = await apiRequest(`/student/live-classes/${encodeURIComponent(item.id)}/join`); const url = meetingLink(result.joinUrl); if (!url) throw new Error('The server did not return a supported secure meeting link.'); setJoinLinks((links) => ({ ...links, [item.id]: url })); });
  const items = resource.data?.liveClasses || [];
  return <div className="db-stack">{!inHub && <PageHeading eyebrow="A shared moment of growth" title="Live Classes">Learn, reflect and connect with the community in real time.</PageHeading>}<div className="db-actions">{['upcoming', 'past'].map((value) => <button key={value} className={scope === value ? 'db-button' : 'db-button-secondary'} aria-pressed={scope === value} onClick={() => { setScope(value); setPage(1); }}>{value === 'upcoming' ? 'Upcoming classes' : 'Past classes'}</button>)}</div><Feedback action={action} /><RequestState resource={resource}>{items.length ? <div className="db-grid">{items.map((item) => <article className="db-panel db-stack" key={item.id}><span className="db-icon-ring"><DashIcon name="calendar" /></span><h2>{item.title}</h2><p>{dateTime(item.startAt, item.timeZone)}</p><p className="db-muted">{item.description}</p><span className="db-badge">{item.status.replaceAll('_', ' ')}</span>{item.cancelledReason && <p>{item.cancelledReason}</p>}{scope === 'upcoming' && item.status !== 'cancelled' && <>{item.registrationRequired && (item.registrationOpen || item.isRegistered) && <button className="db-button-secondary" disabled={action.busy} onClick={() => { if (!item.isRegistered || window.confirm('Cancel your registration for this class?')) register(item); }}>{item.isRegistered ? 'Cancel registration' : 'Register for class'}</button>}{item.registrationRequired && !item.registrationOpen && !item.isRegistered && <p className="db-muted">Registration is closed.</p>}{item.canJoin ? joinLinks[item.id] ? <a className="db-button" href={joinLinks[item.id]} target="_blank" rel="noopener noreferrer">Open secure meeting</a> : <button className="db-button" disabled={action.busy} onClick={() => join(item)}>Get meeting link</button> : <p className="db-muted">{item.isRegistered || !item.registrationRequired ? 'The join link opens shortly before the class starts.' : 'Register to receive access to this class.'}</p>}</>}</article>)}</div> : <div className="db-panel"><EmptyState icon="calendar" title={scope === 'upcoming' ? 'No other class is published yet' : 'No past classes to show'}>{scope === 'upcoming' ? 'The Wednesday Wisdom Call is listed under Upcoming events above. Any additional live class will appear here.' : 'Your available past classes will appear here.'}</EmptyState></div>}</RequestState><div className="db-actions"><button className="db-button-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span className="db-muted">Page {page}</span><button className="db-button-secondary" disabled={items.length < 20} onClick={() => setPage(page + 1)}>Next</button></div></div>;
}

function BookingForm({ session, onBooked }) {
  const { user } = useAuth();
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState(session.durationMinutes);
  const [startAt, setStartAt] = useState('');
  const [topic, setTopic] = useState('');
  const [intake, setIntake] = useState({});
  const [hold, setHold] = useState(null);
  const action = useScheduleAction();
  const slots = useDashboardResource(date ? `/availability/slots?sessionType=${encodeURIComponent(session.id)}&date=${encodeURIComponent(date)}&durationMinutes=${duration}` : null);
  const confirm = () => action.run(async () => {
    const result = await apiRequest(`/bookings/${encodeURIComponent(hold.booking.id)}/confirm`, { method: 'POST' });
    setHold((current) => ({ ...current, booking: result.booking })); onBooked();
    if (result.checkoutUrl) {
      const url = new URL(result.checkoutUrl);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password) throw new Error('The payment provider returned an invalid checkout address.');
      window.location.assign(url.href);
    } else if (result.status !== 'confirmed') throw new Error('Your booking is not confirmed yet. Check the booking status below.');
  });
  if (!session.isFree && (!user.email || !user.emailVerified)) return <section className="db-panel db-stack db-panel-narrow"><h2>{session.name}</h2><p>Add a verified email before choosing your appointment so we can send your receipt and booking confirmation.</p><Link className="db-button" to={`/dashboard/settings?verifyEmail=1&next=${encodeURIComponent(`/dashboard/bookings?sessionType=${session.id}`)}`}>Add and verify your email</Link></section>;
  return <div className="db-panel db-stack"><h2>{session.name}</h2><p className="db-muted">{session.description}</p><p className="db-price">{session.isFree ? 'Free' : money(session.priceMinor, session.currency)} · {session.durationMinutes} minutes</p><Feedback action={action} />{hold ? <div className="db-stack"><p>Booking status: <strong>{hold.booking.status.replaceAll('_', ' ')}</strong></p><p>{dateTime(hold.booking.startAt, hold.booking.timeZone)}</p>{hold.booking.status === 'held' && <><p className="db-muted">Your time is held until {dateTime(hold.holdExpiresAt)}. It is not confirmed until the next step completes.</p><button className="db-button" disabled={action.busy} onClick={confirm}>{session.isFree ? 'Confirm booking' : 'Continue to secure payment'}</button></>}{hold.booking.status === 'pending_payment' && <p className="db-muted">Payment verification is still pending. No appointment confirmation is being assumed.</p>}</div> : <form className="db-form" onSubmit={(event) => { event.preventDefault(); action.run(async () => { const result = await apiRequest('/bookings', { method: 'POST', body: { sessionType: session.id, startAt, durationMinutes: Number(duration), timeZone: user.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone, topic, intake } }); setHold(result); onBooked(); }); }}>
      {session.allowCustomDuration && <label className="db-field">Duration in minutes<input type="number" min={session.minDurationMinutes} max={session.maxDurationMinutes} step={5} required value={duration} onChange={(event) => { setDuration(event.target.value); setStartAt(''); }} /><span className="db-muted">The server confirms pricing for the selected duration.</span></label>}
      <label className="db-field">Choose a date<input type="date" required value={date} onChange={(event) => { setDate(event.target.value); setStartAt(''); }} /></label>
      {date && <RequestState resource={slots}>{slots.data?.slots?.length ? <label className="db-field">Available times ({slots.data.timeZone})<select required value={startAt} onChange={(event) => setStartAt(event.target.value)}><option value="">Select a time</option>{slots.data.slots.map((slot) => <option key={slot.startAt} value={slot.startAt}>{slot.localTime}</option>)}</select></label> : <p className="db-muted">No times are available on this date. Choose another date.</p>}</RequestState>}
      <label className="db-field">What would you like to discuss? (optional)<textarea maxLength={500} value={topic} onChange={(event) => setTopic(event.target.value)} /></label>
      {session.intakeQuestions.map((question) => <label className="db-field" key={question}>{question}<textarea required={session.requireIntake} maxLength={2000} value={intake[question] || ''} onChange={(event) => setIntake({ ...intake, [question]: event.target.value })} /></label>)}
      <button className="db-button" disabled={action.busy || !startAt || slots.loading}>{action.busy ? 'Reserving your time…' : 'Reserve this time'}</button><p className="db-muted">A time reservation is temporary. Paid bookings require verified payment before confirmation.</p>
    </form>}</div>;
}

export function Bookings({ inHub = false } = {}) {
  const [params, setParams] = useSearchParams();
  const selected = params.get('sessionType') || '';
  // Inside the Calls & Bookings hub the active tab also lives in the address, so
  // choosing a session has to rewrite only its own parameter.
  const setSelected = (id) => { const next = new URLSearchParams(params); if (id) next.set('sessionType', id); else next.delete('sessionType'); setParams(next); };
  const [scope, setScope] = useState('upcoming');
  const [page, setPage] = useState(1);
  const types = useDashboardResource('/session-types');
  const bookings = useDashboardResource(`/student/bookings?scope=${scope}&page=${page}&limit=20`);
  const action = useScheduleAction();
  const [joinLinks, setJoinLinks] = useState({});
  const sessions = types.data?.sessionTypes || [];
  const session = sessions.find((item) => item.id === selected);
  const items = bookings.data?.bookings || [];
  const cancel = (item) => action.run(async () => { await apiRequest(`/bookings/${encodeURIComponent(item.id)}/cancel`, { method: 'POST', body: { reason: 'Cancelled by the member through their dashboard.' } }); bookings.reload(); }, 'Your booking has been cancelled.');
  const join = (item) => action.run(async () => { const result = await apiRequest(`/bookings/${encodeURIComponent(item.id)}/join`); const url = meetingLink(result.joinUrl); if (!url) throw new Error('The server did not return a supported secure meeting link.'); setJoinLinks((links) => ({ ...links, [item.id]: url })); });
  return <div className="db-stack">{!inHub && <PageHeading eyebrow="Personal guidance for your journey" title="Book a Call with Zalah">Create space for clarity, connection and your next step.</PageHeading>}<RequestState resource={types}>{sessions.length ? <><div className="db-grid">{sessions.map((item) => <article className="db-panel db-stack" key={item.id}><span className="db-icon-ring"><DashIcon name="video" /></span><h2>{item.name}</h2><p className="db-muted">{item.description}</p><p>{item.durationMinutes} minutes</p><p className="db-price">{item.isFree ? 'Free' : money(item.priceMinor, item.currency)}</p><button className="db-button-secondary" aria-pressed={selected === item.id} onClick={() => setSelected(item.id)}>View availability</button></article>)}</div>{session && <BookingForm key={session.id} session={session} onBooked={bookings.reload} />}</> : <div className="db-panel"><EmptyState icon="video" title="A little space, just for you">Session types and available appointments have not been published yet.</EmptyState></div>}</RequestState><h2>My Schedule</h2><div className="db-actions">{['upcoming', 'past'].map((value) => <button key={value} className={scope === value ? 'db-button' : 'db-button-secondary'} aria-pressed={scope === value} onClick={() => { setScope(value); setPage(1); }}>{value === 'upcoming' ? 'Upcoming bookings' : 'Past bookings'}</button>)}</div><Feedback action={action} /><RequestState resource={bookings}>{items.length ? items.map((item) => <article className="db-panel db-stack" key={item.id}><h3>{item.sessionType?.name || 'Personal call'}</h3><p>{dateTime(item.startAt, item.timeZone)}</p><span className="db-badge">{item.status.replaceAll('_', ' ')}</span><p className="db-muted">{item.durationMinutes} minutes · {money(item.priceMinor, item.currency)}</p><div className="db-actions">{item.status === 'confirmed' && item.hasZoomJoinUrl && (joinLinks[item.id] ? <a className="db-button" href={joinLinks[item.id]} target="_blank" rel="noopener noreferrer">Open secure meeting</a> : <button className="db-button" disabled={action.busy} onClick={() => join(item)}>Get meeting link</button>)}{item.canCancel && <button className="db-button-secondary" disabled={action.busy} onClick={() => { if (window.confirm('Cancel this booking? Any refund is subject to the booking cancellation policy.')) cancel(item); }}>Cancel booking</button>}</div></article>) : <div className="db-panel"><EmptyState icon="calendar" title="Your time, thoughtfully planned">Your {scope} personal calls will appear here.</EmptyState></div>}</RequestState><div className="db-actions"><button className="db-button-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span className="db-muted">Page {page}</span><button className="db-button-secondary" disabled={items.length < 20} onClick={() => setPage(page + 1)}>Next</button></div></div>;
}

const callTabs = [['classes', 'Live Classes'], ['bookings', 'Personal calls & bookings']];

export function CallsAndBookings() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'bookings' ? 'bookings' : 'classes';
  const setTab = (next) => {
    const updated = new URLSearchParams(params);
    updated.set('tab', next);
    if (next === 'classes') updated.delete('sessionType');
    setParams(updated, { replace: true });
  };
  return <div className="db-stack">
    <PageHeading eyebrow="One schedule for the whole journey" title="Calls & Bookings">Group classes and personal time with Zalah, kept in the same place.</PageHeading>
    <UpcomingEvents />
    <div className="db-actions">{callTabs.map(([value, label]) => <button key={value} className={tab === value ? 'db-button' : 'db-button-secondary'} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</div>
    {tab === 'classes' ? <LiveClasses inHub /> : <Bookings inHub />}
  </div>;
}
