import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { authLink } from '../lib/authNavigation';
import { Icon } from '../components/icons';

function reference(params, name) {
  const value = params.get(name);
  // Same rule the course pages use: a plain token that survives re-encoding.
  return typeof value === 'string' && value.length > 0 && value.length <= 80 && !value.includes('/') && value === encodeURIComponent(value)
    ? value
    : null;
}

export function checkoutSelection(params) {
  const course = reference(params, 'course');
  if (course) return { kind: 'course', ref: course };
  const program = reference(params, 'program');
  if (program) return { kind: 'program', ref: program };
  const product = reference(params, 'product');
  const kind = params.get('kind');
  if (product && (kind === 'course' || kind === 'program')) return { kind, ref: product };
  return null;
}

function money(minor, currency) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'CAD', currencyDisplay: 'code' }).format(Number(minor || 0) / 100);
}

function stripeUrl(value, host) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!host || url.hostname === host) ? url.href : null;
  } catch {
    return null;
  }
}

function useOffering(selection) {
  const [state, setState] = useState({ offering: null, error: '', loading: Boolean(selection) });
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (!selection) { setState({ offering: null, error: '', loading: false }); return undefined; }
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: '' }));
    apiRequest(`/offerings/${encodeURIComponent(selection.ref)}`, { signal: controller.signal })
      .then(({ offering }) => { if (!controller.signal.aborted) setState({ offering, error: '', loading: false }); })
      .catch((error) => { if (!controller.signal.aborted) setState({ offering: null, error: error.message || 'This offering could not be loaded.', loading: false }); });
    return () => controller.abort();
  }, [selection?.kind, selection?.ref, revision]);
  return { ...state, reload };
}

/** Prices the single selected offering on the server; the client never sends a total. */
function useQuote(offering, discountCode, onAlreadyOwned) {
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(Boolean(offering));
  const [revision, setRevision] = useState(0);
  const items = useMemo(() => (offering ? [{ productKind: offering.productKind, productId: offering.productId, quantity: 1 }] : null), [offering?.productId]);
  useEffect(() => {
    if (!items) { setBusy(false); return undefined; }
    const controller = new AbortController();
    setBusy(true); setError('');
    apiRequest('/cart/price', { method: 'POST', signal: controller.signal, body: { items, ...(discountCode ? { discountCode } : {}) } })
      .then((priced) => { if (!controller.signal.aborted) { setQuote(priced); setBusy(false); } })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        setQuote(null);
        setBusy(false);
        if (failure.code === 'already_owned') onAlreadyOwned();
        else setError(failure.message || 'This price could not be checked.');
      });
    return () => controller.abort();
  }, [items, discountCode, revision]);
  return { quote, error, busy, reload: () => setRevision((value) => value + 1) };
}

function StatusLine({ tone = 'info', children }) {
  return <p className={tone === 'error' ? 'au-err' : 'cq-enrol-note'} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>;
}

function Summary({ offering, quote, busy, error }) {
  const included = offering.includedOfferings || [];
  const currency = quote?.currency || offering.currency;
  return <div className="cq-col">
    <div className="cq-mod">
      <h3>{offering.name}</h3>
      <p>{offering.isFree ? 'Included at no cost' : `${money(quote?.items?.[0]?.unitPriceMinor ?? offering.priceMinor, currency)} one-time`}</p>
      {included.length > 0 && <ul>{included.map((item) => <li key={item.id}>{item.name}</li>)}</ul>}
      {offering.publishedLessonCount > 0 && <p>{offering.publishedLessonCount} published lesson{offering.publishedLessonCount === 1 ? '' : 's'} across {offering.publishedModuleCount} module{offering.publishedModuleCount === 1 ? '' : 's'}.</p>}
    </div>
    <dl className="cq-facts">
      <div className="cq-fact"><dt>Subtotal</dt><dd>{quote ? money(quote.subtotalMinor, currency) : busy ? 'Checking…' : '—'}</dd></div>
      <div className="cq-fact"><dt>Discount</dt><dd>{quote?.discountMinor ? `− ${money(quote.discountMinor, currency)}` : '—'}</dd></div>
      <div className="cq-fact"><dt>Due today</dt><dd>{quote ? money(quote.totalMinor, currency) : busy ? 'Checking…' : '—'}</dd></div>
      <div className="cq-fact"><dt>Currency</dt><dd>{currency}</dd></div>
    </dl>
    <p className="cq-enrol-note">Access: {offering.accessPolicy === 'lifetime' ? 'lifetime' : offering.accessPolicy.replace(/_/g, ' ')}. The server sets this price and recalculates it every time this page opens.</p>
    {error && <StatusLine tone="error">{error}</StatusLine>}
  </div>;
}

export default function Checkout() {
  const [params, setParams] = useSearchParams();
  const { isAuthed, loading: sessionLoading, owns, refreshEnrollments, user } = useAuth();
  const selection = useMemo(() => checkoutSelection(params), [params.toString()]);
  const offeringState = useOffering(isAuthed ? selection : null);
  const offering = offeringState.offering;
  const discountCode = params.get('discount') || '';
  const [ownedNow, setOwnedNow] = useState(false);
  const quoteState = useQuote(offering && !offeringState.loading ? offering : null, discountCode, () => setOwnedNow(true));
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [errorCode, setErrorCode] = useState('');
  const [order, setOrder] = useState(null);
  const [draftCode, setDraftCode] = useState(discountCode);
  const cartKey = useRef({ signature: '', key: '' });
  const status = params.get('status');
  const orderId = reference(params, 'order');

  const keepSearch = useCallback((values) => {
    const search = new URLSearchParams();
    if (selection) search.set(selection.kind, selection.ref);
    // The chosen discount is part of what is being reviewed: dropping it from
    // the address would re-price the summary under the student's feet.
    for (const key of ['discount', 'status']) if (params.get(key)) search.set(key, params.get(key));
    for (const [key, value] of Object.entries(values)) if (value) search.set(key, String(value));
    setParams(search, { replace: true });
  }, [selection?.kind, selection?.ref, params.toString(), setParams]);

  const resumeOrder = useCallback(async (id) => {
    try {
      const found = await apiRequest(`/orders/${encodeURIComponent(id)}`);
      const next = found.order || found;
      setOrder(next);
      setFailed(false);
      // The webhook can land after the student has already come back. Re-reading
      // the order must also re-read access, or a paid course still looks unpurchased.
      if (next.paymentStatus === 'paid') await refreshEnrollments().catch(() => {});
    } catch (failure) {
      setMessage(failure.message || 'That order could not be found.');
      setFailed(true);
    }
  }, [refreshEnrollments]);

  useEffect(() => { if (orderId) resumeOrder(orderId); }, [orderId, resumeOrder]);

  useEffect(() => {
    if (!order || order.paymentStatus !== 'pending') return undefined;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - startedAt >= 20000) { clearInterval(timer); return; }
      resumeOrder(order.id);
    }, 5000);
    return () => clearInterval(timer);
  }, [order?.id, order?.paymentStatus, resumeOrder]);

  const alreadyOwns = Boolean(offering) && (ownedNow
    || (offering.productKind === 'course' && owns(offering.id))
    || (offering.productKind === 'program' && (offering.includedOfferings || []).length > 0
      && offering.includedOfferings.every((item) => owns(item.id))));

  const settingsReturn = selection
    ? `/dashboard/settings?${new URLSearchParams({ verifyEmail: '1', next: `/checkout?${selection.kind}=${selection.ref}` })}`
    : '/dashboard/settings?verifyEmail=1';

  // The session is restored from the cookie after this page mounts; redirecting
  // while that read is in flight sends signed-in students to the login page.
  if (sessionLoading && !user) return <section className="cq-band cq-lav"><div className="container cq-col"><p role="status">Checking your session…</p></div></section>;
  if (!isAuthed) return <Navigate to={authLink('/login', params.toString())} replace />;

  const beginPayment = async () => {
    if (paying || !offering) return;
    setPaying(true); setMessage(''); setFailed(false); setErrorCode('');
    const signature = `${offering.productKind}:${offering.productId}:${discountCode}`;
    if (cartKey.current.signature !== signature) cartKey.current = { signature, key: crypto.randomUUID() };
    const items = [{ productKind: offering.productKind, productId: offering.productId, quantity: 1 }];
    try {
      const result = await apiRequest('/cart/checkout', {
        method: 'POST',
        headers: { 'Idempotency-Key': cartKey.current.key },
        body: { items, ...(discountCode ? { discountCode } : {}) },
      });
      const url = stripeUrl(result.checkoutUrl, 'checkout.stripe.com');
      if (url) { window.location.assign(url); return; }
      if (result.status === 'paid') {
        await refreshEnrollments();
        keepSearch({ status: 'success', order: result.order?.id });
        setMessage('Payment confirmed. Your lessons are open.');
        return;
      }
      if (result.order?.id) {
        setOrder(result.order);
        keepSearch({ order: result.order.id });
        setMessage('This order is waiting for payment. You can continue whenever you are ready.');
        return;
      }
      setMessage('Payment has not been confirmed. Check your orders before trying again.');
      setFailed(true);
    } catch (failure) {
      if (failure.code === 'already_owned') {
        setOwnedNow(true);
        await refreshEnrollments().catch(() => {});
        setMessage('You already have access to this offering.');
      } else {
        setErrorCode(failure.code || '');
        setMessage(failure.code === 'stripe_not_configured'
          ? 'Card payments are not available on this server right now. Nothing was charged.'
          : failure.message || 'Payment could not be started. Nothing was charged.');
        setFailed(true);
      }
    } finally {
      setPaying(false);
    }
  };

  if (!selection && !orderId) {
    return <section className="cq-band cq-lav"><div className="container cq-col">
      <h1 className="cq-post-title">Nothing to check out yet</h1>
      <p className="cq-body">Choose a course or program and its review page opens here.</p>
      <div className="cq-show-cta" style={{ justifyContent: 'center' }}>
        <Link className="btn btn-gold" to="/courses">Browse courses<Icon name="arrow" size={16} /></Link>
        <Link className="btn btn-ghost" to="/dashboard/orders">My orders</Link>
      </div>
    </div></section>;
  }

  return <section className="cq-band cq-lav">
    <div className="container">
      <nav className="cq-crumb cq-crumb-left" aria-label="Breadcrumb">
        <Link to="/">Home</Link><span aria-hidden="true">/</span>
        <Link to="/courses">Courses</Link><span aria-hidden="true">/</span>
        <span>{offering ? offering.name : 'Checkout'}</span>
      </nav>

      {offeringState.loading && <p role="status">Loading your order summary…</p>}

      {offeringState.error && <div className="cq-col">
        <h1 className="cq-post-title">This offering is not on the catalog</h1>
        <p className="cq-body">{offeringState.error}</p>
        <div className="cq-show-cta" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn btn-ghost" onClick={offeringState.reload}>Try again</button>
          <Link className="btn btn-gold" to="/courses">Browse courses<Icon name="arrow" size={16} /></Link>
        </div>
      </div>}

      {orderId && !offering && !offeringState.loading && <div className="cq-col">
        <h1 className="cq-post-title">Order {order?.orderNumber || orderId}</h1>
        {order ? <p className="cq-body">Payment: {order.paymentStatus.replace(/_/g, ' ')} · Access: {(order.fulfillmentStatus || 'not fulfilled').replace(/_/g, ' ')}</p> : <p role="status">Loading your order…</p>}
        {order && order.paymentStatus === 'pending' && stripeUrl(order.checkoutUrl, 'checkout.stripe.com') && <a className="btn btn-gold" href={stripeUrl(order.checkoutUrl, 'checkout.stripe.com')}>Continue secure payment</a>}
        {order && order.paymentStatus === 'paid' && <Link className="btn btn-gold" to="/dashboard/courses">Start learning<Icon name="arrow" size={16} /></Link>}
        <div className="cq-show-cta"><Link className="btn btn-ghost" to="/dashboard/orders">All my orders</Link></div>
      </div>}

      {offering && !offeringState.loading && <div className="cq-post-grid">
        <div className="cq-post-copy">
          <div className="cq-chips">
            {offering.level && <span className="cq-chip">{offering.level}</span>}
            {offering.length && <span className="cq-chip">{offering.length}</span>}
            <span className="cq-chip">{offering.productKind === 'program' ? 'Bundle' : 'Course'}</span>
          </div>
          <h1 className="cq-post-title">Review your enrolment</h1>
          <p className="cq-post-dek">{offering.short || offering.name}</p>

          {status === 'cancelled' && <StatusLine tone="error">Payment was cancelled, nothing was charged and no access was granted. You can try again below.</StatusLine>}

          {alreadyOwns ? <div className="cq-show-cta">
            <Link className="btn btn-gold" to={offering.productKind === 'program' ? '/dashboard/courses' : `/dashboard/courses/${encodeURIComponent(offering.slug)}`}>Open course<Icon name="arrow" size={16} /></Link>
            <Link className="btn btn-ghost" to="/dashboard/orders">My orders</Link>
          </div> : <>
            <Summary offering={offering} quote={quoteState.quote} busy={quoteState.busy} error={quoteState.error} />

            {!offering.isFree && <form className="cq-show-cta" onSubmit={(event) => {
              event.preventDefault();
              keepSearch({ discount: draftCode.trim().toUpperCase() || undefined, ...(order?.id ? { order: order.id } : {}) });
            }}>
              <label className="cq-post-dek" htmlFor="cq-discount">Discount code (optional)</label>
              <input id="cq-discount" maxLength={40} value={draftCode} placeholder="For example WELCOME10" onChange={(event) => setDraftCode(event.target.value)} />
              <button type="submit" className="btn btn-ghost">Apply</button>
              {discountCode && <button type="button" className="btn btn-ghost" onClick={() => { setDraftCode(''); keepSearch({}); }}>Remove</button>}
            </form>}

            {!offering.availableForPurchase && <StatusLine tone="error">Enrolment is not open yet: the lessons for this offering are still being prepared. You will not be charged.</StatusLine>}
            {!user?.emailVerified && <StatusLine>Add and verify your email so we can send your receipt, <Link to={settingsReturn}>verify email</Link>.</StatusLine>}
            {message && <StatusLine tone={failed ? 'error' : 'info'}>{message}</StatusLine>}
            {errorCode === 'email_required' && <StatusLine>Checkout needs a verified email, <Link to={settingsReturn}>add and verify it</Link>.</StatusLine>}
            {order && order.paymentStatus === 'pending' && <p className="cq-enrol-note">Order {order.orderNumber} is awaiting payment. <button type="button" className="btn btn-ghost" onClick={() => resumeOrder(order.id)}>Refresh status</button></p>}
            {order && order.paymentStatus !== 'pending' && !alreadyOwns && <p className="cq-enrol-note">Payment recorded for order {order.orderNumber}, but your access has not been issued yet, it appears the moment the provider confirmation is verified. <button type="button" className="btn btn-ghost" onClick={() => resumeOrder(order.id)}>Refresh status</button></p>}

            <div className="cq-show-cta">
              {offering.availableForPurchase && <button type="button" className="btn btn-gold" disabled={paying || quoteState.busy || Boolean(quoteState.error)} onClick={beginPayment}>
                {paying ? 'Preparing secure payment…' : offering.isFree ? 'Enrol for free' : `Pay ${money(quoteState.quote?.totalMinor ?? offering.priceMinor, quoteState.quote?.currency || offering.currency)}`}
                <Icon name="arrow" size={16} />
              </button>}
              <Link className="btn btn-ghost" to={`/course/${encodeURIComponent(offering.id)}`}>Back to the course page</Link>
            </div>
            <p className="cq-enrol-note">Card details are entered on Stripe’s secure page. Access is granted only after the server verifies the payment, arriving back here is not a receipt.</p>
          </>}
        </div>
        <div className="cq-post-art">{offering.banner && <img className="cq-art" src={offering.banner} alt="" width={offering.bannerW || undefined} height={offering.bannerH || undefined} />}</div>
      </div>}
    </div>
  </section>;
}
