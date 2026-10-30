import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import ProfileSettings from '../components/ProfileSettings';
import { authDestination } from '../lib/authNavigation';
import { DashIcon, EmptyState, PageHeading, RequestState, dateTime, money, useDashboardResource } from '../components/DashboardUI';

function useAction() {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const run = async (action, message = '') => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); }
    catch (failure) { setError(failure.message || 'This action could not be completed.'); }
    finally { pending.current = false; setBusy(false); }
  };
  return { run, busy, error, notice };
}
function ActionMessage({ action }) {
  return <>{action.error && <p className="db-error" role="alert">{action.error}</p>}{action.notice && <p role="status">{action.notice}</p>}</>;
}
function secureUrl(value, host) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && (!host || url.hostname === host) ? url.href : null; }
  catch { return null; }
}
function Pagination({ page, setPage, more }) {
  return <div className="db-actions"><button className="db-button-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span className="db-muted">Page {page}</span><button className="db-button-secondary" disabled={!more} onClick={() => setPage(page + 1)}>Next</button></div>;
}

/**
 * A redirect back from the payment page is not a receipt. While an order is
 * still awaiting its verified webhook this re-reads it for a bounded window so
 * the student sees access appear without refreshing by hand.
 */
function useFulfilmentPoll(orders, reload) {
  const [seconds, setSeconds] = useState(0);
  const awaiting = orders.some((order) => order.paymentStatus === 'pending' || (order.paymentStatus === 'paid' && order.fulfillmentStatus !== 'fulfilled'));
  useEffect(() => {
    if (!awaiting) { setSeconds(0); return undefined; }
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      if (elapsed >= 20) { clearInterval(timer); return; }
      setSeconds(elapsed);
      reload();
    }, 5000);
    return () => clearInterval(timer);
  }, [awaiting, reload]);
  return awaiting && seconds > 0 ? `Still confirming with the payment provider (${seconds}s). Access is granted only after the server verifies the payment.` : '';
}

export function Orders() {
  const [params] = useSearchParams();
  const orderId = params.get('order');
  const [page, setPage] = useState(1);
  const resource = useDashboardResource(orderId ? `/orders/${encodeURIComponent(orderId)}` : `/orders?page=${page}&limit=20`);
  const orders = resource.data?.order ? [resource.data.order] : resource.data?.orders || [];
  const awaitingNote = useFulfilmentPoll(orders, resource.reload);
  return <div className="db-stack"><PageHeading eyebrow="Your account" title="Orders & Payments">Your purchases, payment status and receipts, together in one place.</PageHeading>{awaitingNote && <p className="db-panel" role="status">{awaitingNote}</p>}{orderId && <Link className="db-text-link" to="/dashboard/orders">View all orders</Link>}<RequestState resource={resource}>{orders.length ? orders.map((order) => <article className="db-panel db-stack" key={order.id}><div className="db-actions" style={{ justifyContent: 'space-between' }}><h2>{order.orderNumber}</h2><span className="db-badge">{order.paymentStatus.replaceAll('_', ' ')}</span></div>{order.items.map((item, index) => <div className="db-actions" key={`${item.productId}-${index}`} style={{ justifyContent: 'space-between' }}><span>{item.title}</span><span>{money(item.lineTotalMinor, item.currency || order.currency)}</span></div>)}<p className="db-price">Total: {money(order.totalMinor, order.currency)}</p><p className="db-muted">{dateTime(order.createdAt)} · Fulfillment: {order.fulfillmentStatus?.replaceAll('_', ' ') || 'Not fulfilled'}</p>{order.refundedMinor > 0 && <p>Refunded: {money(order.refundedMinor, order.currency)}</p>}<div className="db-actions">{order.paymentStatus === 'paid' && <Link className="db-button" to="/dashboard/courses">Start learning<DashIcon name="arrow" size={16} /></Link>}{secureUrl(order.receiptUrl) && <a className="db-button-secondary" href={secureUrl(order.receiptUrl)} target="_blank" rel="noopener noreferrer">View receipt</a>}{secureUrl(order.checkoutUrl, 'checkout.stripe.com') && <a className="db-button" href={secureUrl(order.checkoutUrl, 'checkout.stripe.com')}>Continue secure checkout</a>}<button className="db-button-secondary" onClick={resource.reload}>Refresh status</button></div></article>) : <div className="db-panel"><EmptyState icon="card" title="No orders yet" action={<Link className="db-button" to="/dashboard/explore">Explore courses</Link>}>Your purchases will appear here. A checkout redirect alone never grants course access.</EmptyState></div>}</RequestState>{!orderId && <Pagination page={page} setPage={setPage} more={orders.length === 20} />}</div>;
}

export function Certificates() {
  const resource = useDashboardResource('/student/certificates');
  const action = useAction();
  const download = (certificate) => action.run(async () => {
    const response = await fetch(`/api/v1/certificates/${encodeURIComponent(certificate.certificateId)}/pdf`, { credentials: 'include', redirect: 'error' });
    if (!response.ok) { const result = await response.json().catch(() => null); throw new Error(result?.error?.message || 'The certificate could not be downloaded.'); }
    if (!response.headers.get('content-type')?.includes('application/pdf')) throw new Error('The server did not return a certificate PDF.');
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a'); link.href = url; link.download = `${certificate.certificateId}.pdf`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
  });
  return <div className="db-stack"><PageHeading eyebrow="Celebrate your growth" title="Certificates">Your earned certificates are issued after verified course completion.</PageHeading><ActionMessage action={action} /><RequestState resource={resource}>{resource.data?.certificates?.length ? <div className="db-grid">{resource.data.certificates.map((certificate) => <article className="db-panel db-stack" key={certificate.id}><span className="db-icon-ring"><DashIcon name="award" size={27} /></span><h2>{certificate.courseTitle}</h2><p>{certificate.studentName}</p><p className="db-muted">{certificate.certificateId}<br />Issued {dateTime(certificate.issuedAt)}</p><span className="db-badge">{certificate.status}</span>{certificate.status === 'valid' ? <button className="db-button" disabled={action.busy} onClick={() => download(certificate)}>Download certificate</button> : <p className="db-muted">{certificate.revocationReason || 'This certificate is no longer valid.'}</p>}</article>)}</div> : <div className="db-panel"><EmptyState icon="award" title="Something to be proud of" action={<Link className="db-button-secondary" to="/dashboard/courses">Open my courses</Link>}>Your certificates will appear here when you complete an eligible course.</EmptyState></div>}</RequestState></div>;
}

export function Wishlist() {
  const resource = useDashboardResource('/student/wishlist');
  const action = useAction();
  return <div className="db-stack"><PageHeading eyebrow="Keep your inspiration close" title="Wishlist">A place for the courses you would love to explore next.</PageHeading><ActionMessage action={action} /><RequestState resource={resource}>{resource.data?.items?.length ? <div className="db-grid">{resource.data.items.map((item) => <article className="db-panel db-stack" key={item.id}><span className="db-icon-ring"><DashIcon name="heart" /></span><h2>{item.title}</h2><p className="db-muted">{item.shortDescription}</p><p className="db-price">{item.isFree ? 'Free' : money(item.priceMinor, item.currency)}</p>{item.available || item.alreadyOwned ? <Link className="db-button" to={`/dashboard/${item.alreadyOwned ? 'courses' : 'explore'}/${encodeURIComponent(item.slug)}`}>{item.alreadyOwned ? 'Open my course' : 'Explore course'}</Link> : <p className="db-muted">This course is not currently available.</p>}<button className="db-button-secondary" disabled={action.busy} onClick={() => action.run(async () => { await apiRequest(`/student/wishlist/${encodeURIComponent(item.id)}`, { method: 'DELETE' }); resource.reload(); }, 'Removed from wishlist.')}>Remove from wishlist</button></article>)}</div> : <div className="db-panel"><EmptyState icon="heart" title="Save what speaks to you" action={<Link className="db-button" to="/dashboard/explore">Explore courses</Link>}>Save a course to find it here when the time feels right.</EmptyState></div>}</RequestState></div>;
}

const preferenceLabels = { emailPurchase: 'Purchase emails', emailClassReminders: 'Live class reminders', emailBookingReminders: 'Booking reminders', emailWisdomCall: 'Wisdom Call updates', emailCertificate: 'Certificate emails', emailProductUpdates: 'New courses and updates', inApp: 'In-app notifications' };
function ProfileForm({ profile }) {
  const [preferences, setPreferences] = useState(profile.notificationPreferences || {});
  const action = useAction();
  return <div className="db-stack">
    <ActionMessage action={action} />
    <ProfileSettings profile={profile} action={action} />
    <form className="db-panel db-form" onSubmit={(event) => { event.preventDefault(); action.run(() => apiRequest('/users/me/notification-preferences', { method: 'PATCH', body: preferences }), 'Notification preferences saved.'); }}>
      <h2>Notification preferences</h2>
      {Object.entries(preferenceLabels).map(([key, label]) => <label className="db-actions" key={key}><input type="checkbox" checked={preferences[key] !== false} onChange={(event) => setPreferences({ ...preferences, [key]: event.target.checked })} />{label}</label>)}
      <button className="db-button-secondary" disabled={action.busy}>Save preferences</button>
    </form>
  </div>;
}
export function Settings() {
  const resource = useDashboardResource('/users/me');
  const { user } = useAuth();
  const [params] = useSearchParams();
  const returnTo = params.get('next') ? authDestination(params.toString()) : null;
  return <div className="db-stack"><PageHeading eyebrow="Make yourself at home" title="Settings">Manage your profile, sign-in methods and preferences.</PageHeading>{params.has('verifyEmail') && !user?.emailVerified && <p className="db-panel" role="status">Add and verify your email below to receive purchase receipts and booking confirmations.</p>}{returnTo && <Link className="db-button-secondary" to={returnTo}>Return to your selection</Link>}<RequestState resource={resource}>{resource.data?.user && <ProfileForm profile={resource.data.user} />}</RequestState></div>;
}

function Discussion({ post }) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [likes, setLikes] = useState({ liked: post.liked, likeCount: post.likeCount });
  const comments = useDashboardResource(open ? `/community/posts/${encodeURIComponent(post.id)}/comments?limit=100` : null);
  const action = useAction();
  return <article className="db-panel db-stack"><div className="db-actions"><span className="db-badge">{post.kind}</span><span className="db-muted">{post.author.name} · {dateTime(post.createdAt)}</span></div><h2>{post.title}</h2><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{post.body}</p><div className="db-actions"><button className="db-button-secondary" aria-pressed={likes.liked} disabled={action.busy} onClick={() => action.run(async () => setLikes(await apiRequest('/community/likes', { method: 'POST', body: { targetKind: 'post', target: post.id } })))}><DashIcon name="heart" size={16} />{likes.liked ? 'Liked' : 'Like'} · {likes.likeCount}</button><button className="db-button-secondary" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Hide replies' : `Replies (${post.commentCount})`}</button></div><ActionMessage action={action} />{open && <div className="db-stack"><RequestState resource={comments}>{comments.data?.comments?.length ? comments.data.comments.map((comment) => <div className="db-panel" key={comment.id}><p><strong>{comment.author.name}</strong></p><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{comment.body}</p></div>) : <p className="db-muted">Be the first to reply.</p>}</RequestState><form className="db-form" onSubmit={(event) => { event.preventDefault(); action.run(async () => { await apiRequest(`/community/posts/${encodeURIComponent(post.id)}/comments`, { method: 'POST', body: { body: reply } }); setReply(''); comments.reload(); }, 'Your reply has been posted.'); }}><label className="db-field">Your reply<textarea required maxLength={10000} value={reply} onChange={(event) => setReply(event.target.value)} /></label><button className="db-button" disabled={action.busy || !reply.trim()}>Post reply</button></form></div>}</article>;
}
export function Community() {
  const [page, setPage] = useState(1);
  const resource = useDashboardResource(`/community/posts?page=${page}&limit=20`);
  const [compose, setCompose] = useState(false);
  const [draft, setDraft] = useState({ title: '', body: '', kind: 'discussion' });
  const action = useAction();
  return <div className="db-stack"><PageHeading eyebrow="Grow together" title="Community" action={<button className="db-button" aria-expanded={compose} onClick={() => setCompose(!compose)}>{compose ? 'Close editor' : 'Start a conversation'}</button>}>Connect, share and learn with fellow members.</PageHeading><ActionMessage action={action} />{compose && <form className="db-panel db-form" onSubmit={(event) => { event.preventDefault(); action.run(async () => { await apiRequest('/community/posts', { method: 'POST', body: draft }); setDraft({ title: '', body: '', kind: 'discussion' }); setCompose(false); setPage(1); resource.reload(); }, 'Your conversation has been posted.'); }}><label className="db-field">Post type<select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value })}><option value="discussion">Discussion</option><option value="question">Question</option><option value="milestone">Milestone</option></select></label><label className="db-field">Title<input required minLength={3} maxLength={160} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label className="db-field">Your message<textarea required maxLength={8000} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label><button className="db-button" disabled={action.busy}>Post conversation</button></form>}<RequestState resource={resource}>{resource.data?.posts?.length ? resource.data.posts.map((post) => <Discussion key={post.id} post={post} />) : <div className="db-panel"><EmptyState icon="users" title="A kinder conversation starts with you">Share a question, an insight, or a milestone with the community.</EmptyState></div>}</RequestState><Pagination page={page} setPage={setPage} more={resource.data?.posts?.length === 20} /></div>;
}

export function Notifications() {
  const [page, setPage] = useState(1);
  const resource = useDashboardResource(`/student/notifications?page=${page}&limit=20`);
  const action = useAction();
  const mark = (path) => action.run(async () => { await apiRequest(path, { method: 'POST', body: { read: true } }); resource.reload(); window.dispatchEvent(new Event('cft:notifications-changed')); });
  return <div className="db-stack"><PageHeading eyebrow="Stay connected" title="Notifications" action={<button className="db-button-secondary" disabled={action.busy || !resource.data?.unread} onClick={() => mark('/student/notifications/read-all')}>Mark all as read</button>}>Updates about your learning, bookings and community.</PageHeading><ActionMessage action={action} /><RequestState resource={resource}>{resource.data?.notifications?.length ? resource.data.notifications.map((item) => <article className="db-panel db-stack" key={item.id}><div className="db-actions"><h2>{item.title}</h2>{!item.read && <span className="db-badge">Unread</span>}</div><p>{item.body}</p><p className="db-muted">{dateTime(item.createdAt)}</p><div className="db-actions">{typeof item.link === 'string' && /^\/dashboard(?:\/|$)/.test(item.link) && !/[\\\r\n]/.test(item.link) && <Link className="db-button-secondary" to={item.link}>View update</Link>}{!item.read && <button className="db-button-secondary" disabled={action.busy} onClick={() => mark(`/student/notifications/${encodeURIComponent(item.id)}/read`)}>Mark as read</button>}</div></article>) : <div className="db-panel"><EmptyState icon="bell" title="You’re all caught up">New updates will appear here.</EmptyState></div>}</RequestState><Pagination page={page} setPage={setPage} more={resource.data?.notifications?.length === 20} /></div>;
}
