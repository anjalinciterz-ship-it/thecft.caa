import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { DashIcon, EmptyState, PageHeading, RequestState, dateTime, money, useDashboardResource } from '../components/DashboardUI';

// Mirrors models/Scheduling.js weekday (getUTCDay: 0 = Sunday) and the admin
// booking/live-class validators, so the form only sends values the server accepts.
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const bookingStatuses = ['held', 'pending_payment', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show'];
const liveClassSeries = ['wednesday_wisdom_call', 'course_session', 'workshop', 'retreat', 'other'];
const liveClassStatuses = ['scheduled', 'live', 'completed', 'rescheduled']; // 'cancelled' is the cancel endpoint's job, never the status endpoint.
const label = (value) => String(value || 'Not recorded').replaceAll('_', ' ');
const date = (value) => (value ? dateTime(value) : 'Not recorded');
const amount = (minor, currency) => (minor != null && currency ? money(minor, currency) : 'Not recorded');
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 20 };

const toMinutes = (value) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
};
const fromMinutes = (minutes) => `${String(Math.floor((minutes || 0) / 60)).padStart(2, '0')}:${String((minutes || 0) % 60).padStart(2, '0')}`;
// datetime-local values carry no zone; treat the picked wall time as UTC so a
// scheduled "future" time never silently lands in the past on another machine.
const toIso = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const withZone = /(?:Z|[+-]\d{2}:\d{2})$/.test(raw) ? raw : `${raw}Z`;
  const parsed = new Date(withZone);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

// The backend reports provider truth through syncStatus; the UI never upgrades
// 'none'/'failed'/'pending' into a success claim.
const PROVIDER_TEXT = {
  none: (name) => `${name} is not configured on this server, so nothing was synced.`,
  pending: (name) => `${name} sync is still pending; it is not confirmed yet.`,
  synced: (name) => `${name} is synced.`,
  failed: (name, error) => `${name} sync failed: ${error || 'the server reported a failure without a message'}.`,
};
function ProviderLine({ name, status, error }) {
  const key = ['none', 'pending', 'synced', 'failed'].includes(status) ? status : 'none';
  return <p className={key === 'failed' ? 'db-error' : 'db-muted'} role={key === 'failed' ? 'alert' : undefined}>
    <DashIcon name={name === 'Calendar' ? 'calendar' : 'video'} size={16} /> {PROVIDER_TEXT[key](name === 'Calendar' ? 'Google Calendar' : 'Zoom', error)}
  </p>;
}

function Badge({ value }) {
  return <span className="db-badge">{label(value)}</span>;
}

function Table({ title, columns, children }) {
  return <div role="region" aria-label={title} tabIndex={0} className="ad-table" style={{ overflowX: 'auto' }}>
    <table><caption style={{ textAlign: 'left', paddingBottom: 10 }}>{title}</caption>
      <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{children}</tbody></table>
  </div>;
}

function StaffOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="db-loading" role="status">Checking your session…</p>;
  if (!['admin', 'content_manager'].includes(user?.role)) return <div className="db-error" role="alert">Staff access is required.</div>;
  return children;
}

function Feedback({ action }) {
  return <>
    {action.error && <div className="db-error" role="alert"><p>{action.error}</p><button type="button" className="db-button-secondary" onClick={action.reload}>Refresh the records before retrying</button></div>}
    {action.notice && <p className="db-panel" role="status">{action.notice}</p>}
  </>;
}

// One synchronous guard covers every mutation on the scheduling screens, exactly
// like AdminPeople.jsx: window.confirm first, reload after, never claim success
// on a transport error.
function useAdminAction(reload) {
  const pending = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = async ({ path, method = 'POST', body, confirm, message }) => {
    if (pending.current) return null;
    pending.current = true;
    if (confirm && !window.confirm(confirm)) { pending.current = false; return null; }
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await apiRequest(path, { method, body });
      if (mounted.current) { if (message) setNotice(message); reload(); }
      return result;
    } catch (failure) {
      if (mounted.current) setError(failure.message || 'The change could not be confirmed. Refresh the record before retrying.');
      return null;
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return { run, busy, error, notice, reload };
}

function Pagination({ page, meta, disabled, onPage, name }) {
  const pages = Number.isInteger(meta?.pages) ? meta.pages : null;
  return <nav className="db-actions" aria-label={`${name} pagination`}>
    <button type="button" className="db-button-secondary" disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
    <span className="db-muted" aria-live="polite">Page {page}{pages !== null ? ` of ${Math.max(1, pages)}` : ''}{Number.isInteger(meta?.total) ? ` · ${meta.total} results` : ''}</span>
    <button type="button" className="db-button-secondary" disabled={disabled || pages === null || page >= pages} onClick={() => onPage(page + 1)}>Next</button>
  </nav>;
}

// =========================================================== ADMIN SCHEDULE

export function AdminSchedule() {
  return <StaffOnly><ScheduleScreen /></StaffOnly>;
}

const scheduleSections = [['types', 'Session types'], ['availability', 'Availability windows'], ['blocked', 'Blocked dates']];

function ScheduleScreen() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const section = scheduleSections.some(([key]) => key === params.get('section')) ? params.get('section') : 'types';
  const setSection = (value) => { const next = new URLSearchParams(params); next.set('section', value); setParams(next, { replace: true }); };
  const admin = user?.role === 'admin';
  return <div className="db-stack">
    <PageHeading eyebrow="Scheduling configuration" title="Schedule setup">Session types, weekly availability and blocked dates decide what students can book. These records drive real appointments.</PageHeading>
    {!admin && <p className="db-muted" role="note">You can review scheduling records. Only administrators can create or change session types, availability windows or blocked dates.</p>}
    <div className="db-actions" role="group" aria-label="Schedule sections">
      {scheduleSections.map(([key, text]) => <button key={key} type="button" className={section === key ? 'db-button' : 'db-button-secondary'} aria-pressed={section === key} onClick={() => setSection(key)}>{text}</button>)}
    </div>
    {section === 'types' && <SessionTypesSection admin={admin} />}
    {section === 'availability' && <AvailabilitySection admin={admin} />}
    {section === 'blocked' && <BlockedDatesSection admin={admin} />}
  </div>;
}

function SessionTypesSection({ admin }) {
  const resource = useDashboardResource('/admin/session-types');
  const action = useAdminAction(resource.reload);
  const types = resource.data?.sessionTypes || [];
  return <div className="db-stack">
    <Feedback action={action} />
    <RequestState resource={resource}>
      <div className="db-panel">{types.length ? <Table title="Session types" columns={['Name', 'Duration', 'Price', 'Intake', 'Status', 'Manage']}>
        {types.map((item) => <tr key={item.id}>
          <td><strong>{item.name}</strong><div className="db-muted">{item.slug}</div>{item.description && <div className="db-muted">{item.description}</div>}</td>
          <td>{item.durationMinutes} min{item.allowCustomDuration ? ` · custom ${item.minDurationMinutes ?? item.durationMinutes}–${item.maxDurationMinutes ?? item.durationMinutes}` : ''}<div className="db-muted">Buffers {item.bufferMinutesBefore}/{item.bufferMinutesAfter} min</div></td>
          <td>{item.isFree ? 'Free' : amount(item.priceMinor, item.currency)}<div className="db-muted">{item.stripePriceId ? 'Stripe price cached' : 'No Stripe price yet'}</div></td>
          <td>{item.requireIntake ? <Badge value="intake_required" /> : <Badge value="no_intake" />}<div className="db-muted">{item.intakeQuestions?.length ? `${item.intakeQuestions.length} question(s)` : 'No questions'}</div></td>
          <td><Badge value={item.active ? 'active' : 'inactive'} /><div className="db-muted">Order {item.orderIndex}</div></td>
          <td>{admin ? <button type="button" className="db-button-secondary" disabled={action.busy} onClick={() => action.run({
            path: `/admin/session-types/${encodeURIComponent(item.id)}`, method: 'PATCH', body: { active: !item.active },
            confirm: `${item.active ? 'Deactivate' : 'Activate'} “${item.name}”? ${item.active ? 'Students can no longer book this session type; existing bookings are untouched.' : 'It becomes bookable for students.'}`,
            message: `“${item.name}” is now ${item.active ? 'inactive' : 'active'}.`,
          })}>{item.active ? `Deactivate ${item.name}` : `Activate ${item.name}`}</button> : <span className="db-muted">Read-only</span>}</td>
        </tr>)}
      </Table> : <EmptyState icon="calendar" title="No session types yet">Create a session type to let students book time.</EmptyState>}</div>
    </RequestState>
    {admin ? <SessionTypeCreateForm action={action} /> : <div className="db-panel"><p className="db-muted">Administrator access is required to create a session type.</p></div>}
  </div>;
}

function SessionTypeCreateForm({ action }) {
  return <form className="db-panel db-form" aria-label="Create session type" aria-busy={action.busy} onSubmit={(event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const values = new FormData(formEl);
    const name = String(values.get('name') || '').trim();
    const slug = String(values.get('slug') || '').trim();
    const duration = Number(values.get('durationMinutes'));
    const free = values.has('isFree');
    if (name.length < 2 || !slug || !Number.isInteger(duration) || duration < 5 || duration > 480) return;
    const body = {
      name, slug, durationMinutes: duration, isFree: free,
      priceMinor: free ? 0 : Math.max(0, Number(values.get('priceMinor')) || 0),
      currency: (String(values.get('currency') || 'CAD').trim().toUpperCase()).slice(0, 3),
      allowCustomDuration: values.has('allowCustomDuration'),
      bufferMinutesBefore: Math.max(0, Number(values.get('bufferMinutesBefore')) || 0),
      bufferMinutesAfter: Math.max(0, Number(values.get('bufferMinutesAfter')) || 0),
      requireIntake: values.has('requireIntake'),
      active: values.has('active'),
    };
    const description = String(values.get('description') || '').trim();
    if (description) body.description = description;
    if (body.allowCustomDuration) {
      body.minDurationMinutes = Math.min(480, Math.max(5, Number(values.get('minDurationMinutes')) || duration));
      body.maxDurationMinutes = Math.min(480, Math.max(body.minDurationMinutes, Number(values.get('maxDurationMinutes')) || duration));
    }
    const questions = String(values.get('intakeQuestions') || '').split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 20);
    if (questions.length) body.intakeQuestions = questions;
    const order = Number(values.get('orderIndex'));
    if (Number.isInteger(order)) body.orderIndex = Math.max(0, Math.min(9999, order));
    action.run({ path: '/admin/session-types', method: 'POST', body,
      confirm: `Create the session type “${name}” (${slug})? This changes what students can book and, when paid, what Stripe charges.`,
      message: `Session type “${name}” saved.` }).then(() => { if (!action.error) formEl.reset(); });
  }}>
    <h2>Create a session type</h2>
    <p className="db-muted">A session type drives real money. If the price or duration changes, the cached Stripe price id is cleared on the server so the next booking is charged correctly.</p>
    <div style={gridStyle}>
      <label className="db-field">Session type name<input name="name" required minLength={2} maxLength={120} placeholder="For example: 1:1 Wisdom Call" /></label>
      <label className="db-field">Session type slug<input name="slug" required maxLength={120} pattern="[a-z0-9-]+" placeholder="wisdom-call (lowercase, dashes)" /></label>
      <label className="db-field">Default duration (minutes)<input name="durationMinutes" type="number" required min={5} max={480} step={5} defaultValue={60} /></label>
      <label className="db-field">Currency<input name="currency" maxLength={3} defaultValue="CAD" /></label>
    </div>
    <label className="db-field">Description (optional)<textarea name="description" maxLength={1000} /></label>
    <div className="db-actions">
      <label className="db-field"><input type="checkbox" name="isFree" /> Session type is free</label>
      <label className="db-field"><input type="checkbox" name="allowCustomDuration" /> Allow custom duration</label>
      <label className="db-field"><input type="checkbox" name="requireIntake" /> Require intake answers</label>
      <label className="db-field"><input type="checkbox" name="active" defaultChecked /> Active (bookable)</label>
    </div>
    <div style={gridStyle}>
      <label className="db-field">Price in minor units<input name="priceMinor" type="number" min={0} step={1} defaultValue={0} /></label>
      <label className="db-field">Minimum duration (minutes)<input name="minDurationMinutes" type="number" min={5} max={480} /></label>
      <label className="db-field">Maximum duration (minutes)<input name="maxDurationMinutes" type="number" min={5} max={480} /></label>
    </div>
    <div style={gridStyle}>
      <label className="db-field">Buffer before (minutes)<input name="bufferMinutesBefore" type="number" min={0} max={480} defaultValue={0} /></label>
      <label className="db-field">Buffer after (minutes)<input name="bufferMinutesAfter" type="number" min={0} max={480} defaultValue={10} /></label>
      <label className="db-field">Order index<input name="orderIndex" type="number" min={0} max={9999} defaultValue={0} /></label>
    </div>
    <label className="db-field">Intake questions (one per line, optional)<textarea name="intakeQuestions" maxLength={2000} /></label>
    <button className="db-button" disabled={action.busy}>{action.busy ? 'Saving session type…' : 'Create session type'}</button>
  </form>;
}

function AvailabilitySection({ admin }) {
  const windows = useDashboardResource('/admin/availability');
  const types = useDashboardResource('/admin/session-types');
  const action = useAdminAction(windows.reload);
  const list = windows.data?.windows || [];
  const sessionTypes = types.data?.sessionTypes || [];
  const typeNames = (ids) => (ids || []).map((id) => sessionTypes.find((t) => t.id === id)?.name || 'Unknown type').join(', ') || 'All session types';
  return <div className="db-stack">
    <Feedback action={action} />
    <RequestState resource={windows}>
      <div className="db-panel">{list.length ? <Table title="Availability windows" columns={['Weekday', 'Hours', 'Slot', 'Time zone', 'Applies to', 'Status', 'Manage']}>
        {list.map((item) => <tr key={item.id}>
          <td><strong>{weekdays[item.weekday] || `Day ${item.weekday}`}</strong></td>
          <td>{fromMinutes(item.startMinutes)}–{fromMinutes(item.endMinutes)}</td>
          <td>{item.slotMinutes} min</td>
          <td>{item.timeZone}</td>
          <td>{typeNames(item.sessionTypes)}</td>
          <td><Badge value={item.active ? 'active' : 'inactive'} /></td>
          <td>{admin ? <button type="button" className="db-button-secondary" disabled={action.busy} onClick={() => action.run({
            path: `/admin/availability/${encodeURIComponent(item.id)}`, method: 'DELETE',
            confirm: `Delete the ${weekdays[item.weekday] || item.weekday} ${fromMinutes(item.startMinutes)}–${fromMinutes(item.endMinutes)} availability window? Students can no longer book that time. Existing bookings are untouched.`,
            message: 'Availability window deleted.',
          })}>Delete availability window</button> : <span className="db-muted">Read-only</span>}</td>
        </tr>)}
      </Table> : <EmptyState icon="clock" title="No availability windows">Add a weekly window so students see bookable times.</EmptyState>}</div>
    </RequestState>
    {admin ? <AvailabilityCreateForm action={action} sessionTypes={sessionTypes} /> : <div className="db-panel"><p className="db-muted">Administrator access is required to add an availability window.</p></div>}
  </div>;
}

function AvailabilityCreateForm({ action, sessionTypes }) {
  return <form className="db-panel db-form" aria-label="Create availability window" aria-busy={action.busy} onSubmit={(event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const values = new FormData(formEl);
    const weekday = Number(values.get('weekday'));
    const startMinutes = toMinutes(values.get('start'));
    const endMinutes = toMinutes(values.get('end'));
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return;
    if (!Number.isInteger(startMinutes) || !Number.isInteger(endMinutes) || endMinutes <= startMinutes) return;
    const body = {
      weekday, startMinutes, endMinutes,
      slotMinutes: Math.min(480, Math.max(5, Number(values.get('slotMinutes')) || 30)),
      timeZone: String(values.get('timeZone') || '').trim() || 'America/Denver',
      active: values.has('active'),
    };
    const selected = values.getAll('sessionTypes').filter(Boolean);
    if (selected.length) body.sessionTypes = selected;
    action.run({ path: '/admin/availability', method: 'POST', body,
      confirm: `Add the ${weekdays[weekday]} ${fromMinutes(startMinutes)}–${fromMinutes(endMinutes)} window in ${body.timeZone}? This publishes new bookable time to students.`,
      message: `Availability window saved for ${weekdays[weekday]}.` }).then(() => { if (!action.error) formEl.reset(); });
  }}>
    <h2>Add an availability window</h2>
    <p className="db-muted">Weekly, recurring windows in the instructor’s IANA time zone. The server rejects unknown zones and windows where the end is not after the start.</p>
    <div style={gridStyle}>
      <label className="db-field">Availability weekday<select name="weekday" required defaultValue="1">{weekdays.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>
      <label className="db-field">Availability start time<input type="time" name="start" required defaultValue="09:00" /></label>
      <label className="db-field">Availability end time<input type="time" name="end" required defaultValue="17:00" /></label>
      <label className="db-field">Availability slot length (minutes)<input name="slotMinutes" type="number" min={5} max={480} step={5} defaultValue={30} /></label>
    </div>
    <div style={gridStyle}>
      <label className="db-field">Availability time zone<input name="timeZone" maxLength={60} defaultValue="America/Denver" /></label>
      <label className="db-field">Applicable session types (optional, multi-select)
        <select name="sessionTypes" multiple size={Math.min(6, Math.max(2, sessionTypes.length))} disabled={!sessionTypes.length}>
          {sessionTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <span className="db-muted">{sessionTypes.length ? 'Leave nothing selected to apply to all session types.' : 'No session types available yet.'}</span>
      </label>
    </div>
    <div className="db-actions"><label className="db-field"><input type="checkbox" name="active" defaultChecked /> Availability window active</label></div>
    <button className="db-button" disabled={action.busy}>{action.busy ? 'Saving window…' : 'Create availability window'}</button>
  </form>;
}

function BlockedDatesSection({ admin }) {
  const resource = useDashboardResource('/admin/blocked-dates');
  const action = useAdminAction(resource.reload);
  const [overlap, setOverlap] = useState(null);
  const list = resource.data?.blockedDates || [];
  return <div className="db-stack">
    <Feedback action={action} />
    {overlap && <p className="db-panel" role="status">{overlap}</p>}
    <RequestState resource={resource}>
      <div className="db-panel">{list.length ? <Table title="Blocked dates" columns={['Date', 'Coverage', 'Time zone', 'Reason', 'Manage']}>
        {list.map((item) => <tr key={item.id}>
          <td><strong>{item.date}</strong></td>
          <td>{item.allDay ? 'All day' : `${date(item.startAt)} – ${date(item.endAt)}`}</td>
          <td>{item.timeZone}</td>
          <td>{item.reason || 'No reason recorded'}</td>
          <td>{admin ? <button type="button" className="db-button-secondary" disabled={action.busy} onClick={() => action.run({
            path: `/admin/blocked-dates/${encodeURIComponent(item.id)}`, method: 'DELETE',
            confirm: `Remove the blocked date ${item.date}? Students may become able to book that day again.`,
            message: `Blocked date ${item.date} removed.`,
          })}>Remove blocked date</button> : <span className="db-muted">Read-only</span>}</td>
        </tr>)}
      </Table> : <EmptyState icon="calendar" title="No blocked dates">Blocked days keep the calendar closed on holidays or travel.</EmptyState>}
        <p className="db-muted">The server returns at most 400 blocked dates, oldest first. Confirming an all-day block never cancels existing bookings; overlaps are surfaced for you to review.</p>
      </div>
    </RequestState>
    {admin ? <BlockedDateCreateForm action={action} onOverlap={setOverlap} /> : <div className="db-panel"><p className="db-muted">Administrator access is required to block a date.</p></div>}
  </div>;
}

function BlockedDateCreateForm({ action, onOverlap }) {
  return <form className="db-panel db-form" aria-label="Create blocked date" aria-busy={action.busy} onSubmit={(event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const values = new FormData(formEl);
    const dateValue = String(values.get('date') || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return;
    const allDay = values.has('allDay');
    const body = { date: dateValue, allDay, timeZone: String(values.get('timeZone') || '').trim() || 'America/Denver' };
    if (!allDay) {
      body.startAt = toIso(values.get('startAt'));
      body.endAt = toIso(values.get('endAt'));
      if (!body.startAt || !body.endAt) { onOverlap('A partial-day block needs both a start and an end time. Nothing was saved.'); return; }
    }
    const reason = String(values.get('reason') || '').trim();
    if (reason) body.reason = reason;
    action.run({ path: '/admin/blocked-dates', method: 'POST', body,
      confirm: `Block ${dateValue}${allDay ? ' (all day)' : ' (part of the day)'} for ${body.timeZone}? This closes that time to new bookings.`,
      message: `Blocked date ${dateValue} saved.` }).then((result) => {
      if (result?.blockedDate?.conflictingBookings > 0) onOverlap(`${result.blockedDate.conflictingBookings} active booking(s) already overlap ${result.blockedDate.date}. They were NOT cancelled, review them on the bookings screen.`);
      else onOverlap(null);
      if (!action.error) formEl.reset();
    });
  }}>
    <h2>Block a date</h2>
    <p className="db-muted">An all-day block closes the whole calendar day. A partial block needs a start and end time in the same zone.</p>
    <div style={gridStyle}>
      <label className="db-field">Blocked date<input type="date" name="date" required /></label>
      <label className="db-field">Blocked date time zone<input name="timeZone" maxLength={60} defaultValue="America/Denver" /></label>
    </div>
    <div className="db-actions"><label className="db-field"><input type="checkbox" name="allDay" defaultChecked /> Block the entire day</label></div>
    <div style={gridStyle}>
      <label className="db-field">Partial block start (if not all day)<input type="datetime-local" name="startAt" /></label>
      <label className="db-field">Partial block end (if not all day)<input type="datetime-local" name="endAt" /></label>
    </div>
    <label className="db-field">Reason (optional)<input name="reason" maxLength={300} /></label>
    <button className="db-button" disabled={action.busy}>{action.busy ? 'Saving block…' : 'Create blocked date'}</button>
  </form>;
}

// =========================================================== ADMIN BOOKINGS

export function AdminBookings() {
  return <StaffOnly><BookingsScreen /></StaffOnly>;
}

function BookingsScreen() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const status = bookingStatuses.includes(params.get('status')) ? params.get('status') : '';
  const from = /^\d{4}-\d{2}-\d{2}$/.test(params.get('from') || '') ? params.get('from') : '';
  const to = /^\d{4}-\d{2}-\d{2}$/.test(params.get('to') || '') ? params.get('to') : '';
  const query = new URLSearchParams({ page: String(page), limit: '25' });
  if (status) query.set('status', status);
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const resource = useDashboardResource(`/admin/bookings?${query}`);
  const bookings = resource.data?.bookings || [];
  const [selected, setSelected] = useState(null);
  const onPage = (next) => { const nextParams = new URLSearchParams(params); nextParams.set('page', String(next)); setParams(nextParams, { replace: true }); };
  return <div className="db-stack">
    <PageHeading eyebrow="Booked time" title="Bookings" action={<button type="button" className="db-button-secondary" disabled={resource.loading} onClick={() => { setSelected(null); resource.reload(); }}>Refresh bookings</button>}>One held booking starts as a temporary slot reservation. Confirmation, refunds and reminders are owned by the student lifecycle, not this screen.</PageHeading>
    <form className="db-panel db-stack" key={`${status}:${from}:${to}`} aria-label="Filter bookings" onSubmit={(event) => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const next = new URLSearchParams({ page: '1' });
      ['status', 'from', 'to'].forEach((key) => { const value = String(values.get(key) || '').trim(); if (value) next.set(key, value); });
      setSelected(null); setParams(next, { replace: true });
    }}>
      <div style={gridStyle}>
        <label className="db-field">Booking status<select name="status" defaultValue={status}><option value="">All statuses</option>{bookingStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
        <label className="db-field">Starts on or after<input type="date" name="from" defaultValue={from} /></label>
        <label className="db-field">Starts on or before<input type="date" name="to" defaultValue={to} /></label>
      </div>
      <div className="db-actions"><button className="db-button" disabled={resource.loading}>Apply booking filters</button><button type="button" className="db-button-secondary" onClick={() => { setSelected(null); setParams({}, { replace: true }); }}>Clear booking filters</button></div>
    </form>
    <RequestState resource={resource}>
      <div className="db-panel">{bookings.length ? <Table title="Bookings" columns={['Student', 'Session', 'Starts', 'Status', 'Price', 'Providers', 'Manage']}>
        {bookings.map((item) => <tr key={item.id}>
          <td>{item.student?.name || 'Account unavailable'}<div className="db-muted">{item.student?.email || 'No email'}</div></td>
          <td>{item.sessionType?.name || 'Session no longer available'}<div className="db-muted">{item.durationMinutes} min · {item.topic ? 'Topic noted' : 'No topic'}</div></td>
          <td>{date(item.startAt)}</td>
          <td><Badge value={item.status} /></td>
          <td>{item.priceMinor ? amount(item.priceMinor, item.currency) : 'Free'}</td>
          <td><div className="db-muted">Zoom: {label(item.zoom?.syncStatus)}</div><div className="db-muted">Calendar: {label(item.calendar?.syncStatus)}</div></td>
          <td><button type="button" className="db-button-secondary" onClick={() => setSelected(selected === item.id ? null : item.id)} aria-expanded={selected === item.id} aria-controls={`booking-detail-${item.id}`}>{selected === item.id ? 'Close booking' : 'Review booking'}</button></td>
        </tr>)}
      </Table> : <EmptyState icon="calendar" title="No bookings in this view">Adjust the status or date filters.</EmptyState>}</div>
    </RequestState>
    {selected && <BookingDetail id={selected} onClose={() => setSelected(null)} />}
    <Pagination page={page} meta={resource.meta} disabled={resource.loading} onPage={onPage} name="Bookings" />
  </div>;
}

function BookingDetail({ id, onClose }) {
  const { user } = useAuth();
  const staff = ['admin', 'content_manager'].includes(user?.role);
  const resource = useDashboardResource(`/admin/bookings/${encodeURIComponent(id)}`);
  const booking = resource.data?.booking;
  const action = useAdminAction(resource.reload);
  const [providers, setProviders] = useState(null);
  return <section className="db-panel db-stack" id={`booking-detail-${id}`} aria-label="Booking detail">
    <div className="db-actions"><h2 style={{ margin: 0 }}>Booking detail</h2><button type="button" className="db-button-secondary" onClick={onClose}>Close</button><button type="button" className="db-button-secondary" disabled={resource.loading} onClick={() => { setProviders(null); resource.reload(); }}>Refresh booking</button></div>
    <Feedback action={action} />
    {providers && <div className="db-panel" role="status"><strong>Provider resync result</strong><ProviderLine name="Zoom" status={providers.zoom?.syncStatus} error={providers.zoom?.syncError} /><ProviderLine name="Calendar" status={providers.calendar?.syncStatus} error={providers.calendar?.syncError} /></div>}
    <RequestState resource={resource}>
      {booking ? <>
        <dl style={gridStyle}>
          <div><dt className="db-muted">Student</dt><dd>{booking.user?.id ? <Link className="db-text-link" to={`/admin/students/${encodeURIComponent(booking.user.id)}`}>{booking.user.name || booking.user.email}</Link> : 'Account unavailable'}<div className="db-muted">{booking.user?.email || ''}</div></dd></div>
          <div><dt className="db-muted">Session type</dt><dd>{booking.sessionType?.name || 'Session no longer available'}<div className="db-muted">{booking.sessionType?.slug || ''}</div></dd></div>
          <div><dt className="db-muted">Starts / ends</dt><dd>{date(booking.startAt)}<div className="db-muted">to {date(booking.endAt)} · {booking.timeZone}</div></dd></div>
          <div><dt className="db-muted">Status</dt><dd><Badge value={booking.status} />{booking.holdExpiresAt && <div className="db-muted">Hold expires {date(booking.holdExpiresAt)}</div>}</dd></div>
          <div><dt className="db-muted">Price</dt><dd>{booking.priceMinor ? amount(booking.priceMinor, booking.currency) : 'Free'}</dd></div>
          <div><dt className="db-muted">Order</dt><dd>{booking.order ? <Link className="db-text-link" to={`/admin/orders/${encodeURIComponent(booking.order.id)}`}>{booking.order.orderNumber}</Link> : 'No order yet'}</dd></div>
        </dl>
        {booking.topic && <p><strong>Topic:</strong> {booking.topic}</p>}
        {booking.cancellation && <p className="db-muted">Cancelled {date(booking.cancellation.cancelledAt)} · {booking.cancellation.reason || 'No reason recorded'} · refund {label(booking.cancellation.refundStatus)}</p>}
        <div className="db-panel db-stack"><h3>Provider status</h3>
          <ProviderLine name="Zoom" status={booking.zoom?.syncStatus} error={booking.zoom?.syncError} />
          <ProviderLine name="Calendar" status={booking.calendar?.syncStatus} error={booking.calendar?.syncError} />
          {staff && <div className="db-actions"><button type="button" className="db-button-secondary" disabled={action.busy || booking.status === 'cancelled'} onClick={() => action.run({
            path: `/admin/bookings/${encodeURIComponent(id)}/resync`, method: 'POST',
            confirm: 'Re-run the Zoom and Google Calendar sync for this booking? If a provider is not configured on this server, it will report that honestly rather than pretend to succeed.',
            message: 'Resync requested.',
          }).then((result) => { if (result) setProviders(result); })}>{action.busy ? 'Resyncing…' : 'Resync providers'}</button></div>}
          <p className="db-muted">A join link or passcode is never exposed here; those are select-hidden fields handed only to the booked student.</p>
        </div>
        <BookingNoteForm booking={booking} staff={staff} action={action} />
        {!staff && <p className="db-muted">Staff access is required to annotate or resync a booking.</p>}
        <div className="db-panel" role="note"><h3>Cancelling a booking</h3><p className="db-muted">The administration scheduling API intentionally exposes no booking-cancel endpoint. A booking must move through the student lifecycle (<code>POST /api/v1/bookings/:id/cancel</code>) so its slot lock, refund and notification stay consistent; an admin status override could orphan a reserved slot. Record any cancellation reason as an internal note above.</p></div>
      </> : !resource.loading && !resource.error && <div className="db-error" role="alert">The server did not return this booking. <button type="button" className="db-button-secondary" onClick={resource.reload}>Try again</button></div>}
    </RequestState>
  </section>;
}

function BookingNoteForm({ booking, staff, action }) {
  const [notes, setNotes] = useState(booking.notes || '');
  useEffect(() => { setNotes(booking.notes || ''); }, [booking.id, booking.notes]);
  if (!staff) return null;
  return <form className="db-form" aria-label="Update booking internal note" aria-busy={action.busy} onSubmit={(event) => {
    event.preventDefault();
    action.run({ path: `/admin/bookings/${encodeURIComponent(booking.id)}/notes`, method: 'PATCH', body: { notes: notes.trim() },
      confirm: 'Save this internal note on the booking? It is visible to staff only, not to the student.',
      message: notes.trim() ? 'Booking note saved.' : 'Booking note cleared.' });
  }}>
    <label className="db-field">Booking internal note<textarea maxLength={2000} value={notes} disabled={action.busy} onChange={(event) => setNotes(event.target.value)} /></label>
    <button className="db-button-secondary" disabled={action.busy}>{action.busy ? 'Saving note…' : 'Save booking note'}</button>
  </form>;
}

// =========================================================== ADMIN LIVE CLASSES

export function AdminLiveClasses() {
  return <StaffOnly><LiveClassesScreen /></StaffOnly>;
}

function LiveClassesScreen() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const scope = ['upcoming', 'past', 'all'].includes(params.get('scope')) ? params.get('scope') : 'all';
  const series = liveClassSeries.includes(params.get('series')) ? params.get('series') : '';
  const query = new URLSearchParams({ page: String(page), limit: '25', scope });
  if (series) query.set('series', series);
  const resource = useDashboardResource(`/admin/live-classes?${query}`);
  const action = useAdminAction(resource.reload);
  const items = resource.data?.liveClasses || [];
  const [selected, setSelected] = useState(null);
  const [created, setCreated] = useState(null);
  const onPage = (next) => { const nextParams = new URLSearchParams(params); nextParams.set('page', String(next)); setParams(nextParams, { replace: true }); };
  return <div className="db-stack">
    <PageHeading eyebrow="Gatherings" title="Live classes">Schedule, publish and cancel live classes. Registrations and provider status are read from the same records students see.</PageHeading>
    <Feedback action={action} />
    {created && <div className="db-panel" role="status"><strong>Live class “{created.title}” saved.</strong><ProviderLine name="Zoom" status={created.zoom?.syncStatus} /></div>}
    <LiveClassCreateForm action={action} onCreated={setCreated} />
    <form className="db-panel db-actions" key={`${scope}:${series}`} aria-label="Filter live classes" onSubmit={(event) => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const next = new URLSearchParams({ page: '1' });
      const s = String(values.get('scope') || 'all'); next.set('scope', ['upcoming', 'past', 'all'].includes(s) ? s : 'all');
      const se = String(values.get('series') || ''); if (se) next.set('series', se);
      setSelected(null); setParams(next, { replace: true });
    }}>
      <label className="db-field">Class scope<select name="scope" defaultValue={scope}><option value="all">All dates</option><option value="upcoming">Upcoming</option><option value="past">Past</option></select></label>
      <label className="db-field">Series<select name="series" defaultValue={series}><option value="">All series</option>{liveClassSeries.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <button className="db-button" disabled={resource.loading}>Apply class filters</button>
    </form>
    <RequestState resource={resource}>
      <div className="db-panel">{items.length ? <Table title="Live classes" columns={['Class', 'When', 'Status', 'Publication', 'Registrations', 'Zoom', 'Manage']}>
        {items.map((item) => <tr key={item.id}>
          <td><strong>{item.title}</strong><div className="db-muted">{item.slug}</div><div className="db-muted">{label(item.series)}</div></td>
          <td>{date(item.startAt)}<div className="db-muted">to {date(item.endAt)} · {item.timeZone}</div></td>
          <td><Badge value={item.status} /></td>
          <td><Badge value={item.publicationStatus} /></td>
          <td>{item.registrationCount ?? 0} registered<br /><span className="db-muted">{item.attendanceCount ?? 0} attended</span></td>
          <td>{item.zoom?.syncStatus === 'synced' ? <Badge value="synced" /> : <span className="db-muted">{label(item.zoom?.syncStatus)}</span>}</td>
          <td><button type="button" className="db-button-secondary" onClick={() => setSelected(selected === item.id ? null : item.id)} aria-expanded={selected === item.id} aria-controls={`live-detail-${item.id}`}>{selected === item.id ? 'Close class' : 'Review class'}</button></td>
        </tr>)}
      </Table> : <EmptyState icon="calendar" title="No live classes in this view">Create one above or change the filters.</EmptyState>}</div>
    </RequestState>
    {selected && <LiveClassDetail item={items.find((entry) => entry.id === selected)} action={action} onClose={() => setSelected(null)} />}
    <Pagination page={page} meta={resource.meta} disabled={resource.loading} onPage={onPage} name="Live classes" />
  </div>;
}

const liveClassFrequencies = ['none', 'weekly', 'biweekly', 'monthly'];
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const integer = (value, fallback) => { const parsed = Number.parseInt(value, 10); return Number.isFinite(parsed) ? parsed : fallback; };

function recurrenceSummary(recurrence, timeZone) {
  if (!recurrence?.enabled) return 'One occurrence only.';
  if (recurrence.templateId) return 'Generated automatically from a repeating template.';
  const at = `${String(integer(recurrence.hour, 0)).padStart(2, '0')}:${String(integer(recurrence.minute, 0)).padStart(2, '0')}`;
  const day = Number.isInteger(recurrence.weekday) ? weekdayNames[recurrence.weekday] : 'the same weekday';
  return `Repeats ${label(recurrence.freq)} on ${day} at ${at} ${timeZone}, created ${recurrence.generateWeeksAhead || 8} weeks ahead by the schedule job.`;
}

function LiveClassCreateForm({ action, onCreated }) {
  return <form className="db-panel db-form" aria-label="Create live class" aria-busy={action.busy} onSubmit={(event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const values = new FormData(formEl);
    const title = String(values.get('title') || '').trim();
    const startAt = toIso(values.get('startAt'));
    const endAt = toIso(values.get('endAt'));
    if (title.length < 2 || !startAt || !endAt || new Date(endAt) <= new Date(startAt)) return;
    const body = {
      title, startAt, endAt,
      timeZone: String(values.get('timeZone') || '').trim() || 'America/Denver',
      series: liveClassSeries.includes(String(values.get('series'))) ? String(values.get('series')) : 'other',
      publicationStatus: String(values.get('publicationStatus')) === 'published' ? 'published' : 'draft',
      registrationRequired: values.has('registrationRequired'),
      registrationOpen: values.has('registrationOpen'),
    };
    const description = String(values.get('description') || '').trim();
    if (description) body.description = description;
    const freq = liveClassFrequencies.includes(String(values.get('freq'))) ? String(values.get('freq')) : 'none';
    // The rule is what makes one published schedule (the Wednesday Wisdom Call)
    // repeat; the job turns it into individual classes, so this form never has to.
    if (freq !== 'none') {
      body.recurrence = {
        enabled: true, freq,
        weekday: integer(values.get('weekday'), 3),
        hour: integer(values.get('hour'), 19),
        minute: integer(values.get('minute'), 0),
        generateWeeksAhead: integer(values.get('generateWeeksAhead'), 8),
      };
    }
    action.run({ path: '/admin/live-classes', method: 'POST', body,
      confirm: `Create the live class “${title}” as ${body.publicationStatus}${body.publicationStatus === 'published' ? ', immediately visible to students' : ''}${freq === 'none' ? '' : `, repeating ${freq}`}?`,
      message: `Live class “${title}” created.` }).then((result) => { if (result?.liveClass) onCreated(result.liveClass); else onCreated(null); if (!action.error) formEl.reset(); });
  }}>
    <h2>Create a live class</h2>
    <p className="db-muted">Start and end times are stored as UTC with an explicit zone. A draft is hidden from students until you publish it.</p>
    <div style={gridStyle}>
      <label className="db-field">Live class title<input name="title" required minLength={2} maxLength={160} /></label>
      <label className="db-field">Series<select name="series" defaultValue="other">{liveClassSeries.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label className="db-field">Publication status<select name="publicationStatus" defaultValue="draft"><option value="draft">Draft (hidden)</option><option value="published">Published (visible)</option></select></label>
    </div>
    <div style={gridStyle}>
      <label className="db-field">Starts (date and time)<input type="datetime-local" name="startAt" required /></label>
      <label className="db-field">Ends (date and time)<input type="datetime-local" name="endAt" required /></label>
      <label className="db-field">Time zone<input name="timeZone" maxLength={60} defaultValue="America/Denver" /></label>
    </div>
    <label className="db-field">Description (optional)<textarea name="description" maxLength={8000} /></label>
    <div className="db-actions">
      <label className="db-field"><input type="checkbox" name="registrationRequired" /> Registration required</label>
      <label className="db-field"><input type="checkbox" name="registrationOpen" defaultChecked /> Registration open</label>
    </div>
    <fieldset>
      <legend>Repeating schedule</legend>
      <p className="db-muted">A repeating class is a template: the schedule job creates each individual occurrence in the zone above, so a 7:00 PM Mountain call stays at 7:00 PM Mountain through daylight saving. Occurrences already on the calendar are never rewritten.</p>
      <div style={gridStyle}>
        <label className="db-field">Repeats<select name="freq" defaultValue="none">{liveClassFrequencies.map((item) => <option key={item} value={item}>{item === 'none' ? 'Once only' : label(item)}</option>)}</select></label>
        <label className="db-field">Weekday<select name="weekday" defaultValue="3">{weekdayNames.map((name, index) => <option key={name} value={index}>{name}</option>)}</select></label>
        <label className="db-field">Start hour (0–23)<input type="number" name="hour" min={0} max={23} defaultValue={19} /></label>
        <label className="db-field">Start minute<input type="number" name="minute" min={0} max={59} defaultValue={0} /></label>
        <label className="db-field">Weeks created ahead<input type="number" name="generateWeeksAhead" min={1} max={52} defaultValue={8} /></label>
      </div>
    </fieldset>
    <button className="db-button" disabled={action.busy}>{action.busy ? 'Creating class…' : 'Create live class'}</button>
  </form>;
}

function LiveClassDetail({ item, action, onClose }) {
  const registrations = useDashboardResource(item ? `/admin/live-classes/${encodeURIComponent(item.id)}/registrations` : null);
  const [cancelReason, setCancelReason] = useState('');
  if (!item) return null;
  return <section className="db-panel db-stack" id={`live-detail-${item.id}`} aria-label="Live class detail">
    <div className="db-actions"><h2 style={{ margin: 0 }}>{item.title}</h2><button type="button" className="db-button-secondary" onClick={onClose}>Close</button></div>
    <Feedback action={action} />
    <dl style={gridStyle}>
      <div><dt className="db-muted">Slug</dt><dd>{item.slug}</dd></div>
      <div><dt className="db-muted">Series</dt><dd>{label(item.series)}</dd></div>
      <div><dt className="db-muted">When</dt><dd>{date(item.startAt)}<div className="db-muted">to {date(item.endAt)} · {item.timeZone}</div></dd></div>
      <div><dt className="db-muted">Status / publication</dt><dd><Badge value={item.status} /> <Badge value={item.publicationStatus} /></dd></div>
      <div><dt className="db-muted">Repetition</dt><dd>{recurrenceSummary(item.recurrence, item.timeZone)}</dd></div>
      <div><dt className="db-muted">Instructor</dt><dd>{item.instructor?.name || 'Not assigned'}</dd></div>
      <div><dt className="db-muted">Registrations</dt><dd>{item.registrationCount ?? 0} registered · {item.attendanceCount ?? 0} attended</dd></div>
    </dl>
    {item.cancelledReason && <p className="db-error" role="alert">Cancelled: {item.cancelledReason}</p>}
    {item.description && <p>{item.description}</p>}
    <div className="db-panel db-stack"><h3>Providers & recording</h3>
      <ProviderLine name="Zoom" status={item.zoom?.syncStatus} />
      {item.zoom?.joinUrl ? <p className="db-muted">Attendee join link is stored for students; the host link and passcode are never shown here.</p> : null}
      <p className="db-muted">{item.recording?.available ? 'A recording is marked available by the pipeline.' : 'No recording is marked available yet. Recording availability is set by the pipeline, not by this screen, you cannot fabricate it here.'}</p>
      <p className="db-muted">Recording access policy: {label(item.recording?.accessPolicy)}.</p>
    </div>
    {['draft', 'archived'].includes(item.publicationStatus) ? (
      <div className="db-actions"><button type="button" className="db-button-secondary" disabled={action.busy} onClick={() => action.run({
        path: `/admin/live-classes/${encodeURIComponent(item.id)}`, method: 'PATCH', body: { publicationStatus: 'published' },
        confirm: `Publish “${item.title}”? It becomes visible to students immediately.`, message: `“${item.title}” is now published.` })}>{action.busy ? 'Publishing…' : 'Publish class'}</button></div>
    ) : (
      <div className="db-actions"><button type="button" className="db-button-secondary" disabled={action.busy} onClick={() => action.run({
        path: `/admin/live-classes/${encodeURIComponent(item.id)}`, method: 'PATCH', body: { publicationStatus: 'archived' },
        confirm: `Archive “${item.title}”? It is hidden from students.`, message: `“${item.title}” is now archived.` })}>{action.busy ? 'Archiving…' : 'Archive class'}</button></div>
    )}
    {item.status !== 'cancelled' && <div className="db-actions" role="group" aria-label="Change live class status">
      {liveClassStatuses.filter((status) => status !== item.status).map((status) => <button key={status} type="button" className="db-button-secondary" disabled={action.busy} onClick={() => action.run({
        path: `/admin/live-classes/${encodeURIComponent(item.id)}/status`, method: 'POST', body: { status },
        confirm: `Mark “${item.title}” as ${label(status)}?`, message: `“${item.title}” is now ${label(status)}.` })}>Set {label(status)}</button>)}
    </div>}
    <div className="db-panel db-stack"><h3>Registrations</h3>
      <RequestState resource={registrations}>{(registrations.data?.registrations || []).length ? <Table title="Class registrations" columns={['Student', 'Status', 'Registered', 'Joined']}>
        {(registrations.data.registrations).map((reg) => <tr key={reg.id}>
          <td>{reg.user?.name || 'Account unavailable'}<div className="db-muted">{reg.user?.email || ''}</div></td>
          <td><Badge value={reg.status} /></td>
          <td>{date(reg.registeredAt)}</td>
          <td>{reg.joinedAt ? date(reg.joinedAt) : 'Has not joined'}</td>
        </tr>)}
      </Table> : <EmptyState icon="users" title="No registrations yet">Students who register through their dashboard appear here.</EmptyState>}</RequestState>
    </div>
    {item.status !== 'cancelled' && <form className="db-form" aria-label="Cancel live class" aria-busy={action.busy} onSubmit={(event) => {
      event.preventDefault();
      const reason = cancelReason.trim();
      if (reason.length < 3) return;
      const notify = new FormData(event.currentTarget).has('notify');
      action.run({ path: `/admin/live-classes/${encodeURIComponent(item.id)}/cancel`, method: 'POST', body: { reason, notify },
        confirm: `Cancel “${item.title}”?${notify ? ' Registered students will be notified and emailed.' : ' No notifications will be sent.'} Registrations are kept as a record, not deleted.`,
        message: `“${item.title}” is cancelled.` }).then(() => setCancelReason(''));
    }}>
      <label className="db-field">Cancellation reason (required)<textarea required minLength={3} maxLength={500} value={cancelReason} disabled={action.busy} onChange={(event) => setCancelReason(event.target.value)} /></label>
      <div className="db-actions"><label className="db-field"><input type="checkbox" name="notify" defaultChecked /> Notify registered students</label></div>
      <button className="db-button-secondary" disabled={action.busy || cancelReason.trim().length < 3}>{action.busy ? 'Cancelling…' : 'Cancel live class'}</button>
    </form>}
  </section>;
}
