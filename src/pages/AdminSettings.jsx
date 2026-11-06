import { useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PageHeading, RequestState, dateTime, useDashboardResource } from '../components/DashboardUI';

// Mirrors the accepted groups and leaves of the admin settings validator. The
// backend merges each object group and replaces arrays, and it accepts nothing
// outside this list: integration credentials live in the environment and are
// never read or written through this screen.
const sections = [
  {
    key: 'general',
    title: 'Regional',
    root: true,
    fields: [['timeZone', 'Platform time zone (IANA, for example America/Denver)', 'text']],
  },
  {
    key: 'brand',
    title: 'Brand',
    fields: [
      ['name', 'Brand name', 'text'],
      ['shortName', 'Short name', 'text'],
      ['tagline', 'Tagline', 'text'],
      ['mission', 'Mission statement', 'textarea'],
      ['logoUrl', 'Logo URL', 'text'],
      ['logoColorUrl', 'Logo URL on dark', 'text'],
      ['faviconUrl', 'Favicon URL', 'text'],
    ],
  },
  {
    key: 'contact',
    title: 'Contact details',
    fields: [
      ['email', 'Public email', 'text'],
      ['supportEmail', 'Support email', 'text'],
      ['phone', 'Phone', 'text'],
      ['addressLine1', 'Address line 1', 'text'],
      ['addressLine2', 'Address line 2', 'text'],
      ['country', 'Country', 'text'],
      ['supportHours', 'Support hours', 'text'],
    ],
  },
  {
    key: 'currency',
    title: 'Currency',
    fields: [
      ['default', 'Default currency', 'text'],
      ['reportingCurrency', 'Reporting currency', 'text'],
      ['supported', 'Supported currencies, comma separated', 'list'],
      ['conversionNotes', 'Conversion notes', 'textarea'],
    ],
  },
  {
    key: 'wisdomCall',
    title: 'Weekly Wisdom Call',
    fields: [
      ['enabled', 'The call is open for registration', 'checkbox'],
      ['weekday', 'Weekday', 'select', [['0', 'Sunday'], ['1', 'Monday'], ['2', 'Tuesday'], ['3', 'Wednesday'], ['4', 'Thursday'], ['5', 'Friday'], ['6', 'Saturday']]],
      ['hour', 'Hour (0-23)', 'number'],
      ['minute', 'Minute (0-59)', 'number'],
      ['timeZone', 'Call time zone', 'text'],
      ['zoomJoinUrl', 'Join URL', 'text'],
    ],
  },
  {
    key: 'bookingPolicy',
    title: 'Booking policy',
    fields: [
      ['minNoticeMinutes', 'Minimum notice (minutes)', 'number'],
      ['maxAdvanceDays', 'Bookable horizon (days)', 'number'],
      ['holdMinutes', 'Reservation hold (minutes)', 'number'],
      ['allowSameDay', 'Allow same-day sessions', 'checkbox'],
    ],
  },
  {
    key: 'courseAccessPolicy',
    title: 'Course access policy',
    fields: [
      ['defaultKind', 'Default access kind', 'select', [['lifetime', 'lifetime'], ['fixed_duration', 'fixed duration'], ['subscription', 'subscription']]],
      ['defaultDurationDays', 'Default duration (days)', 'number'],
      ['revokeOnFullRefund', 'Revoke access on a full refund', 'checkbox'],
    ],
  },
  {
    key: 'notifications',
    title: 'Reminder lead times (minutes before the event)',
    fields: [
      ['bookingReminderMinutes', 'Booking reminders', 'list'],
      ['liveClassReminderMinutes', 'Live class reminders', 'list'],
      ['wisdomCallReminderMinutes', 'Wisdom Call reminders', 'list'],
    ],
  },
  {
    key: 'seoDefaults',
    title: 'Default search-engine fields',
    fields: [
      ['titleTemplate', 'Title template', 'text'],
      ['description', 'Default meta description', 'textarea'],
      ['ogImage', 'Default social image URL', 'text'],
    ],
  },
  {
    key: 'announcementBanner',
    title: 'Announcement banner',
    fields: [
      ['enabled', 'Show the banner on the public site', 'checkbox'],
      ['text', 'Banner text', 'text'],
      ['link', 'Banner link', 'text'],
      ['tone', 'Banner tone', 'select', [['gold', 'gold'], ['plum', 'plum'], ['blue', 'blue']]],
    ],
  },
  {
    key: 'appearance',
    title: 'Appearance',
    note: 'The default theme is what a first-time visitor gets. “Light” and “Dark” apply that theme immediately; “System” follows the visitor’s own device setting, so a phone in dark mode opens the site in dark. Either way the moment a visitor picks a theme themselves their choice is theirs to keep, the default only ever applies to a first visit.',
    fields: [
      ['toggleEnabled', 'Show the theme toggle to visitors', 'checkbox'],
      ['defaultTheme', 'Default theme', 'select', [['light', 'light'], ['dark', 'dark'], ['system', 'system']]],
    ],
  },
  {
    key: 'legalLinks',
    title: 'Legal links',
    fields: [
      ['privacy', 'Privacy page', 'text'],
      ['terms', 'Terms page', 'text'],
      ['refund', 'Refund policy page', 'text'],
    ],
  },
];

const key = (group, name) => `${group}.${name}`;
const text = (value) => (value === undefined || value === null ? '' : String(value));

function readFields(settings) {
  const values = {};
  for (const section of sections) {
    const group = section.root ? settings : settings?.[section.key] || {};
    for (const [name, , type] of section.fields) {
      const value = group?.[name];
      if (type === 'checkbox') values[key(section.key, name)] = Boolean(value);
      else if (type === 'list') values[key(section.key, name)] = Array.isArray(value) ? value.join(', ') : '';
      else values[key(section.key, name)] = text(value);
    }
  }
  return values;
}

function readSocials(settings) {
  return (Array.isArray(settings?.socials) ? settings.socials : []).map((item) => ({ label: text(item?.label), url: text(item?.url) }));
}

function parseList(value) {
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

/**
 * Only altered leaves travel, so an untouched default is never re-submitted and
 * a partial group merge cannot silently overwrite a value another admin changed.
 */
function buildPatch(original, draft) {
  const patch = {};
  const write = (section, name, value) => {
    if (section.root) { patch[name] = value; return; }
    (patch[section.key] ||= {})[name] = value;
  };
  for (const section of sections) {
    for (const [name, , type] of section.fields) {
      const id = key(section.key, name);
      const next = draft[id];
      const before = original[id];
      if (next === before) continue;
      if (type === 'number') {
        const parsed = Number(String(next).trim());
        if (!Number.isFinite(parsed)) continue;
        write(section, name, parsed);
      } else if (type === 'checkbox') {
        write(section, name, Boolean(next));
      } else if (type === 'list') {
        const items = parseList(next);
        if (JSON.stringify(items) === JSON.stringify(parseList(before || ''))) continue;
        write(section, name, section.key === 'currency' ? items.map((item) => item.toUpperCase()) : items.map(Number));
      } else {
        write(section, name, String(next).trim());
      }
    }
  }
  return patch;
}

function Field({ section, field, value, disabled, onChange }) {
  const [name, legend, type, options] = field;
  const id = key(section, name);
  if (type === 'checkbox') {
    return <label className="db-field db-checkbox" htmlFor={id}><input id={id} type="checkbox" checked={value} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />{legend}</label>;
  }
  if (type === 'textarea') {
    return <label className="db-field" htmlFor={id}>{legend}<textarea id={id} rows={3} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></label>;
  }
  if (type === 'select') {
    return <label className="db-field" htmlFor={id}>{legend}<select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
  }
  return <label className="db-field" htmlFor={id}>{legend}<input id={id} type={type === 'number' ? 'number' : 'text'} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></label>;
}

export function AdminSettings() {
  const { user } = useAuth();
  const resource = useDashboardResource('/admin/settings');
  const settings = resource.data?.settings;
  const [draft, setDraft] = useState(null);
  const [socials, setSocials] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const admin = user?.role === 'admin';

  // A stored snapshot is the comparison base: reseeding only while nothing has
  // been edited keeps an administrator's in-progress work from vanishing.
  useEffect(() => {
    if (!settings || draft) return undefined;
    setDraft(readFields(settings));
    setSocials(readSocials(settings));
    return undefined;
  }, [settings, draft]);

  const original = useMemo(() => (settings ? readFields(settings) : null), [settings]);
  const originalSocials = useMemo(() => (settings ? readSocials(settings) : null), [settings]);
  const patch = useMemo(() => (draft && original ? buildPatch(original, draft) : {}), [draft, original]);
  const socialsChanged = socials !== null && originalSocials !== null && JSON.stringify(socials) !== JSON.stringify(originalSocials);
  const changedCount = Object.keys(patch).length + (socialsChanged ? 1 : 0);

  const rootFields = new Set(sections.filter((section) => section.root).flatMap((section) => section.fields.map(([name]) => name)));
  const reset = (base, applied = {}) => {
    const merged = { ...base };
    for (const [group, value] of Object.entries(applied)) {
      if (rootFields.has(group)) merged[group] = value;
      else merged[group] = { ...base?.[group], ...value };
    }
    setDraft(readFields(merged));
    setSocials(readSocials(merged));
  };

  const save = async () => {
    if (pending.current || !changedCount) return;
    const body = { ...patch };
    if (socialsChanged) body.socials = socials.map((item) => ({ label: item.label.trim(), url: item.url.trim() }));
    pending.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await apiRequest('/admin/settings', { method: 'PATCH', body });
      const stored = data?.settings || settings;
      reset(stored, {});
      setNotice(`Site settings saved at ${dateTime(stored?.updatedAt)}. The change is recorded in the audit log.`);
      resource.reload();
    } catch (failure) {
      setError(failure.message || 'The settings could not be saved.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const updateSocial = (index, field, value) => setSocials(socials.map((item, position) => (position === index ? { ...item, [field]: value } : item)));

  return <div className="db-stack">
    <PageHeading eyebrow="Platform configuration" title="Site settings">Display and policy values behind the public site, the booking rules and reminders. Integration credentials are configured through the server environment and are never shown or edited here.</PageHeading>
    <RequestState resource={resource}>{draft && socials && <>
      {changedCount > 0 && <p className="db-muted">{changedCount} unsaved change{changedCount === 1 ? '' : 's'}. Use Save site settings below to store them.</p>}
      {error && <div className="db-error" role="alert"><p>{error}</p><p>The stored values may already have changed. Use Reload stored values before retrying.</p></div>}
      {notice && <p className="db-panel" role="status">{notice}</p>}
      {!admin && <p className="db-muted">Read-only access. Only administrators can change site settings.</p>}
      <section className="db-panel db-stack"><h2>Social links</h2>
        {socials.map((item, index) => <div className="db-actions" key={index}>
          <label className="db-field" htmlFor={`social-label-${index}`}>Link {index + 1} label<input id={`social-label-${index}`} value={item.label} disabled={!admin} onChange={(event) => updateSocial(index, 'label', event.target.value)} /></label>
          <label className="db-field" htmlFor={`social-url-${index}`}>URL<input id={`social-url-${index}`} value={item.url} disabled={!admin} onChange={(event) => updateSocial(index, 'url', event.target.value)} /></label>
          <button type="button" className="db-button-secondary" disabled={!admin} onClick={() => setSocials(socials.filter((_, position) => position !== index))}>Remove link {index + 1}</button>
        </div>)}
        <button type="button" className="db-button-secondary" disabled={!admin || socials.length >= 20} onClick={() => setSocials([...socials, { label: '', url: '' }])}>Add social link</button>
        {!socials.length && <p className="db-muted">No social links are stored.</p>}
      </section>
      {sections.map((section) => <section className="db-panel db-stack" key={section.key}>
        <h2>{section.title}</h2>
        {section.note && <p className="db-muted">{section.note}</p>}
        <div className="db-grid">{section.fields.map((field) => <Field key={field[0]} section={section.key} field={field} disabled={!admin} value={draft[key(section.key, field[0])]} onChange={(value) => { setDraft({ ...draft, [key(section.key, field[0])]: value }); setNotice(''); setError(''); }} />)}</div>
      </section>)}
      <p className="db-muted">Navigation entries and published page content are managed in Pages &amp; content; this screen does not edit them.</p>
      <div className="db-actions"><button className="db-button" disabled={busy || !admin || !changedCount} onClick={save}>{busy ? 'Saving…' : 'Save site settings'}</button><button type="button" className="db-button-secondary" disabled={busy || !changedCount} onClick={() => { reset(settings); setNotice(''); setError(''); }}>Discard changes</button><button type="button" className="db-button-secondary" disabled={busy} onClick={() => { reset(settings); resource.reload(); }}>Reload stored values</button></div>
    </>}</RequestState>
  </div>;
}
