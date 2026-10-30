import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { EmptyState, PageHeading, RequestState, dateTime, money, useDashboardResource } from '../components/DashboardUI';

const orderStatuses = ['pending', 'paid', 'partially_refunded', 'refunded', 'failed', 'cancelled', 'expired'];
const refundReasons = ['requested_by_customer', 'duplicate', 'fraudulent', 'policy', 'other'];
const terminalRefunds = new Set(['succeeded', 'failed', 'cancelled']);
const label = (value) => String(value || 'Not recorded').replaceAll('_', ' ');
const date = (value) => value ? dateTime(value) : 'Not recorded';
const amount = (minor, currency) => minor != null && currency ? money(minor, currency) : 'Not recorded';
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 20 };

function Badge({ value }) {
  return <span className="db-badge">{label(value)}</span>;
}

function secureUrl(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}

function Table({ title, columns, children }) {
  return <div role="region" aria-label={title} tabIndex={0} style={{ overflowX: 'auto' }}><table><caption style={{ textAlign: 'left', paddingBottom: 10 }}>{title}</caption><thead><tr>{columns.map((column) => <th scope="col" key={column}>{column}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function StaffOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="db-loading" role="status">Checking your session…</p>;
  if (!['admin', 'content_manager'].includes(user?.role)) return <div className="db-error" role="alert">Staff access is required.</div>;
  return children;
}

export function AdminOrders() {
  return <StaffOnly><OrderList /></StaffOnly>;
}

function OrderList() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page'), 10) || 1);
  const search = (params.get('search') || '').slice(0, 120);
  const status = orderStatuses.includes(params.get('status')) ? params.get('status') : '';
  const query = new URLSearchParams({ page: String(page), limit: '25' });
  if (search) query.set('search', search);
  if (status) query.set('status', status);
  const resource = useDashboardResource(`/admin/orders?${query}`);
  const orders = resource.data?.orders || [];
  const pages = Number.isInteger(resource.meta?.pages) ? resource.meta.pages : null;
  const onPage = (next) => { const nextParams = new URLSearchParams(query); nextParams.delete('limit'); nextParams.set('page', String(next)); setParams(nextParams); };
  return <div className="db-stack">
    <PageHeading eyebrow="Commerce" title="Orders & payments" action={<button type="button" className="db-button-secondary" disabled={resource.loading} onClick={resource.reload}>Refresh orders</button>}>Review payments, fulfillment and refund history. Amounts are shown in their original currencies.</PageHeading>
    <form className="db-panel db-stack" key={`${search}:${status}`} aria-label="Filter orders" onSubmit={(event) => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const next = new URLSearchParams({ page: '1' });
      ['search', 'status'].forEach((key) => { const value = String(values.get(key) || '').trim(); if (value) next.set(key, value); });
      setParams(next);
    }}>
      <div style={gridStyle}><label className="db-field">Search order number, student name or email<input type="search" name="search" maxLength={120} defaultValue={search} placeholder="Order number or customer" /></label><label className="db-field">Payment status<select name="status" defaultValue={status}><option value="">All payment statuses</option>{orderStatuses.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label></div>
      <div className="db-actions"><button className="db-button" disabled={resource.loading}>Apply filters</button><button type="button" className="db-button-secondary" onClick={() => setParams({})}>Clear filters</button></div>
    </form>
    <RequestState resource={resource}><div className="db-panel">{orders.length ? <Table title="Orders" columns={['Order', 'Student', 'Total', 'Payment / fulfillment', 'Created']}>
      {orders.map((order) => <tr key={order.id}><td><Link className="db-text-link" to={`/admin/orders/${encodeURIComponent(order.id)}`}>{order.orderNumber}</Link><div className="db-muted">{order.items?.map((item) => item.title).join(', ')}</div></td><td>{order.student?.id ? <Link className="db-text-link" to={`/admin/students/${encodeURIComponent(order.student.id)}`}>{order.student.name || 'View student'}</Link> : 'Student no longer available'}</td><td>{amount(order.totalMinor, order.currency)}</td><td><Badge value={order.paymentStatus} /><div className="db-muted">{label(order.fulfillmentStatus)}</div></td><td>{date(order.createdAt)}</td></tr>)}
    </Table> : <EmptyState icon="card" title="No matching orders">Try a different order number, student or status.</EmptyState>}</div></RequestState>
    <nav className="db-actions" aria-label="Orders pagination"><button type="button" className="db-button-secondary" disabled={resource.loading || page <= 1} onClick={() => onPage(page - 1)}>Previous</button><span className="db-muted" aria-live="polite">Page {page}{pages !== null ? ` of ${Math.max(1, pages)}` : ''}{Number.isInteger(resource.meta?.total) ? ` · ${resource.meta.total} orders` : ''}</span><button type="button" className="db-button-secondary" disabled={resource.loading || pages === null || page >= pages} onClick={() => onPage(page + 1)}>Next</button></nav>
  </div>;
}

// Preserve one immutable request through transport errors, refreshes and remounts.
// Tab-scoped storage is namespaced by the acting administrator and the order.
const refundAttempts = new Map();
const refundRequestsInFlight = new Set();
function storedAttempt(storageKey) {
  if (refundAttempts.has(storageKey)) return refundAttempts.get(storageKey);
  try {
    const value = JSON.parse(window.sessionStorage.getItem(storageKey) || 'null');
    if (value && /^[A-Za-z0-9:_-]{8,128}$/.test(value.key) && refundReasons.includes(value.body?.reason)
      && typeof value.body?.note === 'string' && value.body.note.trim().length >= 3 && value.body.note.length <= 1000
      && (value.body.amountMinor === undefined || (Number.isSafeInteger(value.body.amountMinor) && value.body.amountMinor > 0))) {
      refundAttempts.set(storageKey, value);
      return value;
    }
  } catch { /* In-memory preservation still works when browser storage is unavailable. */ }
  return null;
}

function saveAttempt(storageKey, value) {
  if (value) refundAttempts.set(storageKey, value);
  else refundAttempts.delete(storageKey);
  try {
    if (value) window.sessionStorage.setItem(storageKey, JSON.stringify(value));
    else window.sessionStorage.removeItem(storageKey);
    return true;
  } catch { return false; }
}

function requestKey() {
  if (window.crypto?.randomUUID) return `admin-refund:${window.crypto.randomUUID()}`;
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return `admin-refund:${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function RefundForm({ record, actorId, refreshing, readError, onResult, reload }) {
  const order = record.order;
  const storageKey = `cft:admin-refund:${actorId}:${order.id}`;
  const [attempt, setAttempt] = useState(() => storedAttempt(storageKey));
  const attemptRef = useRef(attempt);
  const pending = useRef(false);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);
  const [mode, setMode] = useState(attempt?.body.amountMinor != null ? 'partial' : 'full');
  const [minor, setMinor] = useState(attempt?.body.amountMinor != null ? String(attempt.body.amountMinor) : '');
  const [reason, setReason] = useState(attempt?.body.reason || 'requested_by_customer');
  const [note, setNote] = useState(attempt?.body.note || '');
  const refund = attempt?.refund;
  const finished = terminalRefunds.has(refund?.status);
  const pendingMinor = (record.refunds || []).filter((item) => item.status === 'pending').reduce((total, item) => total + item.amountMinor, 0);
  const remaining = Math.max(0, order.totalMinor - (record.detail.refundedMinor || 0) - pendingMinor);
  const eligible = remaining > 0 && ['paid', 'partially_refunded'].includes(order.paymentStatus)
    && (record.payments || []).some((payment) => ['succeeded', 'partially_refunded'].includes(payment.status));
  const validMinor = /^[0-9]+$/.test(minor) && Number.isSafeInteger(Number(minor)) && Number(minor) > 0;
  const valid = note.trim().length >= 3 && (mode === 'full' || (validMinor && Number(minor) <= remaining));

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const commit = (value) => {
    attemptRef.current = value;
    const persisted = saveAttempt(storageKey, value);
    if (mounted.current) { setAttempt(value); setStorageWarning(!persisted); }
  };

  // GET detail may observe a webhook completion after POST returned pending.
  useEffect(() => {
    const current = attemptRef.current;
    const latest = current?.refund?.id && record.refunds?.find((item) => item.id === current.refund.id);
    if (latest && (latest.status !== current.refund.status || latest.entitlementAction !== current.refund.entitlementAction)) {
      const next = { ...current, refund: { ...current.refund, ...latest } };
      attemptRef.current = next;
      const persisted = saveAttempt(storageKey, next);
      setAttempt(next); setStorageWarning(!persisted);
    }
  }, [record.refunds, storageKey, refund?.id]);

  const send = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    if (refundRequestsInFlight.has(storageKey)) { setError('This order already has a refund request in progress in this tab. Wait, then retry the same request.'); return; }
    if (finished) return;
    let current = attemptRef.current;
    if (!current && (!eligible || !valid || refreshing || readError)) return;
    // Acquire synchronously, before confirmation and before the CSRF request.
    pending.current = true;
    try {
      if (!current) {
        const body = { reason, note: note.trim(), ...(mode === 'partial' ? { amountMinor: Number(minor) } : {}) };
        if (!window.confirm(`Issue a ${mode === 'full' ? 'full remaining-balance' : 'partial'} refund for order ${order.orderNumber}?\nAmount: ${amount(mode === 'full' ? remaining : Number(minor), order.currency)}${mode === 'full' ? ' (server rechecks the remaining balance)' : ''}\nReason: ${label(reason)}\nNote: ${body.note}\nThis moves money and may revoke access under the product’s refund policy.`)) return;
        current = { key: requestKey(), body, refund: null, rejected: false };
        commit(current);
      } else if (!window.confirm(`Retry the same refund request for ${order.orderNumber}? Its original amount, reason and idempotency key will be reused. This checks or completes the existing request; it does not create a new refund request.`)) return;
      refundRequestsInFlight.add(storageKey);
      setBusy(true); setError('');
      const result = await apiRequest(`/admin/orders/${encodeURIComponent(order.id)}/refund`, {
        method: 'POST', body: current.body, headers: { 'Idempotency-Key': current.key },
      });
      if (!result?.refund?.id || !result.refund.status) throw new Error('The server response did not confirm the refund status. Retry this same request.');
      commit({ ...current, refund: result.refund, rejected: false });
      if (mounted.current) onResult(result.order);
    } catch (failure) {
      // Only validator/balance rejections known to precede reservation can be edited.
      // Provider mismatch, 409, 5xx and network failures retain the original request.
      const rejected = (failure.status === 400 && failure.code === 'bad_request') || (failure.status === 422 && failure.code === 'validation_error');
      if (current) commit({ ...current, rejected });
      if (mounted.current) {
        setError(`${failure.message || 'The refund status could not be confirmed.'}${rejected ? ' The server rejected this request.' : ' Do not start another refund; retry this same request or refresh the order to check its status.'}`);
      }
    } finally {
      pending.current = false;
      refundRequestsInFlight.delete(storageKey);
      if (mounted.current) setBusy(false);
    }
  };

  const reset = () => {
    if (pending.current || refundRequestsInFlight.has(storageKey) || (!finished && !attempt?.rejected)) return;
    if (!window.confirm(attempt?.rejected ? 'Edit this rejected request? A new idempotency key will be created only after you review and confirm again.' : `The previous refund is ${label(refund.status)}. Prepare a separate refund request? Review the latest balance before confirming another financial action.`)) return;
    commit(null); setError('');
    if (!attempt?.rejected) { setMinor(''); setMode('full'); setNote(''); }
    reload();
  };

  return <div className="db-panel db-stack">
    <h2>Refund this order</h2>
    <p className="db-muted">Administrator-only financial action. The server validates the payment, unreserved balance and access policy. A pending response is not a completed refund.</p>
    <div className="db-actions"><span>Available to request: <strong>{amount(remaining, order.currency)}</strong></span>{pendingMinor > 0 && <span className="db-muted">Pending reservations: {amount(pendingMinor, order.currency)}</span>}</div>
    {readError && <p className="db-error" role="alert">The latest order could not be loaded. Refresh before starting a new refund. An existing request can still be retried with its original key.</p>}
    {storageWarning && <p className="db-error" role="alert">Browser storage is unavailable. The retry key is preserved while this app stays open. Do not reload or close this tab until the request is resolved.</p>}
    {error && <p className="db-error" role="alert">{error}</p>}
    {attempt && <div className="db-panel" role={refund?.status === 'failed' ? 'alert' : 'status'}>
      <p><strong>{refund ? `Refund ${label(refund.status)}` : attempt.rejected ? 'Request rejected' : 'Refund outcome not yet confirmed'}</strong></p>
      {refund ? <>
        <p>{amount(refund.amountMinor, refund.currency)}</p>
        {refund.status === 'succeeded' && <p>The server reports a successful refund. Access action: {label(refund.entitlementAction)}.</p>}
        {refund.status === 'pending' && <p>Processing is pending. Money movement is not confirmed. Refresh the order or retry this same request.</p>}
        {refund.status === 'failed' && <p>{refund.failureMessage || 'The provider reported a failed refund. No successful refund is confirmed for this request.'}</p>}
        {refund.status === 'cancelled' && <p>The refund was cancelled, not completed.</p>}
      </> : <p>{attempt.rejected ? 'Correct the request or retry it unchanged.' : 'The original request is saved. Do not create a different request while this outcome is unresolved.'}</p>}
      <p className="db-muted">Request key: <span style={{ overflowWrap: 'anywhere' }}>{attempt.key}</span></p>
    </div>}
    {!attempt && !eligible && <p className="db-muted">There is no refundable, unreserved successful payment in the current record. Refresh if a payment or refund is still processing.</p>}
    <form className="db-form" aria-label="Issue order refund" aria-busy={busy} onSubmit={send}>
      <fieldset className="db-form" disabled={busy || !!attempt || refreshing || !!readError || !eligible}><legend>Refund request</legend>
        <label className="db-field">Refund amount<select value={mode} onChange={(event) => setMode(event.target.value)}><option value="full">Full remaining unreserved balance</option><option value="partial">Specific amount in minor units</option></select></label>
        {mode === 'partial' && <label className="db-field">Amount in minor units ({order.currency})<input type="text" inputMode="numeric" pattern="[0-9]+" required value={minor} onChange={(event) => setMinor(event.target.value)} aria-describedby={`refund-minor-${order.id}`} /><span className="db-muted" id={`refund-minor-${order.id}`}>Enter a positive whole number, not a decimal. For a two-decimal currency, 100 means 1.00. Maximum currently available: {remaining} minor units.{validMinor ? ` Preview: ${amount(Number(minor), order.currency)}.` : ''}</span></label>}
        <label className="db-field">Refund reason<select required value={reason} onChange={(event) => setReason(event.target.value)}>{refundReasons.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
        <label className="db-field">Audit note (required)<textarea required minLength={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Explain why this refund is being issued" /></label>
      </fieldset>
      {attempt && <p className="db-muted">Amount, reason and note are locked to the saved request. Retrying always reuses the same Idempotency-Key.</p>}
      <div className="db-actions">
        {!finished && <button className="db-button" disabled={busy || refreshing || (!attempt && (!eligible || !valid || !!readError))}>{busy ? 'Checking refund…' : attempt ? 'Retry same refund request' : 'Review & confirm refund'}</button>}
        <button type="button" className="db-button-secondary" disabled={busy || refreshing} onClick={reload}>Refresh refund status</button>
        {(finished || attempt?.rejected) && <button type="button" className="db-button-secondary" disabled={busy || refreshing || !!readError} onClick={reset}>{attempt?.rejected ? 'Edit rejected request' : 'Prepare a new refund'}</button>}
      </div>
    </form>
  </div>;
}

function OrderRecord({ record }) {
  const { order, detail, payments = [], refunds = [], entitlements = [] } = record;
  return <>
    <div className="db-panel db-stack"><div className="db-actions"><span>Payment: <Badge value={order.paymentStatus} /></span><span>Fulfillment: <Badge value={order.fulfillmentStatus} /></span><span>Refund: <Badge value={order.refundStatus} /></span></div>
      <dl style={gridStyle}><div><dt className="db-muted">Student</dt><dd>{order.student?.id ? <Link className="db-text-link" to={`/admin/students/${encodeURIComponent(order.student.id)}`}>{order.student.name || 'View student'}</Link> : 'Student no longer available'}</dd></div><div><dt className="db-muted">Created</dt><dd>{date(order.createdAt)}</dd></div><div><dt className="db-muted">Paid</dt><dd>{date(order.paidAt)}</dd></div>{detail.invoiceNumber && <div><dt className="db-muted">Invoice number</dt><dd>{detail.invoiceNumber}</dd></div>}</dl>
      {detail.failureReason && <p className="db-error">Payment failure: {detail.failureReason}</p>}
      {detail.notes && <p style={{ whiteSpace: 'pre-wrap' }}><strong>Order notes:</strong> {detail.notes}</p>}
      {secureUrl(detail.receiptUrl) && <div><a className="db-button-secondary" href={secureUrl(detail.receiptUrl)} target="_blank" rel="noopener noreferrer">Open receipt in a new tab</a></div>}
    </div>
    <div className="db-panel db-stack"><h2>Order items</h2><Table title="Purchased items" columns={['Item', 'Quantity', 'Line total']}>{order.items?.map((item, index) => <tr key={index}><td>{item.title}</td><td>{item.quantity}</td><td>{amount(item.lineTotalMinor, order.currency)}</td></tr>)}</Table>
      <dl style={gridStyle}><div><dt className="db-muted">Subtotal</dt><dd>{amount(detail.subtotalMinor, order.currency)}</dd></div><div><dt className="db-muted">Discount{detail.discountCode ? ` · ${detail.discountCode}` : ''}</dt><dd>{amount(detail.discountMinor, order.currency)}</dd></div><div><dt className="db-muted">Tax</dt><dd>{amount(detail.taxMinor, order.currency)}</dd></div><div><dt className="db-muted">Order total</dt><dd className="db-price">{amount(order.totalMinor, order.currency)}</dd></div><div><dt className="db-muted">Successfully refunded</dt><dd>{amount(detail.refundedMinor, order.currency)}</dd></div></dl>
    </div>
    <div className="db-panel db-stack"><h2>Payment history</h2>{payments.length ? <Table title="Payment attempts" columns={['Status', 'Amount / refunded', 'Method', 'Date', 'Details']}>
      {payments.map((payment) => <tr key={payment.id}><td><Badge value={payment.status} /></td><td>{amount(payment.amountMinor, payment.currency)}<div className="db-muted">Refunded: {amount(payment.amountRefundedMinor, payment.currency)}</div></td><td>{payment.cardBrand || 'Not recorded'}{payment.cardLast4 && <> ending in {payment.cardLast4}</>}</td><td>{date(payment.paidAt || payment.createdAt)}</td><td>{payment.failureMessage && <p>{payment.failureMessage}</p>}{payment.stripePaymentIntentId && <p className="db-muted">{payment.stripePaymentIntentId}</p>}{secureUrl(payment.receiptUrl) && <a className="db-text-link" href={secureUrl(payment.receiptUrl)} target="_blank" rel="noopener noreferrer">Receipt (new tab)</a>}</td></tr>)}
    </Table> : <EmptyState icon="card" title="No payment records">A pending order is not proof of a successful charge.</EmptyState>}</div>
    <div className="db-panel db-stack"><h2>Refund history</h2>{refunds.length ? <Table title="Refund requests" columns={['Status', 'Amount', 'Reason', 'Access action', 'Processed']}>
      {refunds.map((refund) => <tr key={refund.id}><td><Badge value={refund.status} /></td><td>{amount(refund.amountMinor, refund.currency)}</td><td>{label(refund.reason)}</td><td>{refund.status === 'succeeded' ? <>{label(refund.entitlementAction)}<div className="db-muted">{Array.isArray(refund.entitlementsRevoked) ? refund.entitlementsRevoked.length : Number(refund.entitlementsRevoked) || 0} entitlements revoked</div></> : 'No completed refund action'}</td><td>{date(refund.processedAt)}</td></tr>)}
    </Table> : <EmptyState icon="card" title="No refunds recorded" />}<p className="db-muted">Pending requests reserve balance but are not successful refunds. Historical audit notes and provider failure messages are not included in this detail response.</p></div>
    <div className="db-panel db-stack"><h2>Access from this order</h2>{entitlements.length ? <Table title="Order entitlements" columns={['Product', 'Kind', 'Status', 'Revoked']}>
      {entitlements.map((entry) => <tr key={entry.id}><td>{entry.product?.title || 'Product no longer available'}</td><td>{label(entry.productKind)}</td><td><Badge value={entry.status} /></td><td>{date(entry.revokedAt)}</td></tr>)}
    </Table> : <EmptyState title="No entitlements recorded">Access is granted only after verified fulfillment.</EmptyState>}<p className="db-muted">Refund-related revocation is determined by the server and each product’s access policy.</p></div>
  </>;
}

export function AdminOrderDetail() {
  const { id } = useParams();
  return <StaffOnly><OrderDetail key={id} id={id} /></StaffOnly>;
}

function OrderDetail({ id }) {
  const { user } = useAuth();
  const resource = useDashboardResource(`/admin/orders/${encodeURIComponent(id)}`);
  // GET /orders/:id -> data.order -> { order, detail, payments, refunds, entitlements }.
  const record = resource.data?.order;
  const [snapshot, setSnapshot] = useState(null);
  useEffect(() => { if (record?.order && record.detail) setSnapshot(record); }, [record]);
  const visible = record?.order && record.detail ? record : snapshot;
  // Keep RefundForm mounted while useDashboardResource clears data on reload.
  const onResult = (next) => { if (next?.order && next.detail) setSnapshot(next); resource.reload(); };
  return <div className="db-stack" style={{ overflowWrap: 'anywhere' }}>
    <PageHeading eyebrow="Commerce" title={visible?.order.orderNumber || 'Order detail'} action={<Link className="db-button-secondary" to="/admin/orders">All orders</Link>}>Payment, fulfillment and access are reported separately.</PageHeading>
    <div className="db-actions"><button type="button" className="db-button-secondary" disabled={resource.loading} onClick={resource.reload}>Refresh order</button>{user?.role !== 'admin' && <p className="db-muted">Read-only access. Only administrators can issue refunds.</p>}</div>
    <RequestState resource={resource}>{record?.order && record.detail ? <OrderRecord record={record} /> : !resource.loading && !resource.error && <div className="db-error" role="alert">The server did not return an order record. <button type="button" className="db-button-secondary" onClick={resource.reload}>Try again</button></div>}</RequestState>
    {user?.role === 'admin' && visible && <RefundForm key={`${user.id || user._id}:${id}`} record={visible} actorId={user.id || user._id} refreshing={resource.loading} readError={resource.error || (!resource.loading && !record?.order)} onResult={onResult} reload={resource.reload} />}
  </div>;
}
