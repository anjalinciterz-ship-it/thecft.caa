import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './icons';
import { SectionHead, SectionDivider } from './ui';
import { useDashboardResource } from './DashboardUI';
import '../styles/cms.css';

export const CMS_BLOCK_TYPES = Object.freeze([
  'hero', 'section_head', 'text', 'image', 'image_text', 'course_grid', 'featured_course',
  'testimonials', 'instructor', 'cta', 'faq', 'video_embed', 'book_block', 'community_banner',
  'announcement', 'footer_content', 'navigation', 'stats', 'divider', 'quote', 'countdown',
]);
const list = (value) => Array.isArray(value) ? value : [];
const text = (value) => typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const choice = (value, options, fallback) => options.includes(value) ? value : fallback;
const icons = new Set(['lotus', 'leaf', 'users', 'globe', 'calendar', 'arrow', 'check', 'seeker', 'heart', 'star', 'play', 'book', 'clock']);
const BrandIcon = ({ name, ...props }) => <Icon name={icons.has(name) ? name : 'lotus'} {...props} />;

/** Fail closed: never permit script/data URLs, protocol-relative URLs or credentials. */
export function safeCMSUrl(value, { asset = false, internal = false } = {}) {
  if (typeof value !== 'string' || !value || /[\s\\\u0000-\u001f\u007f]/.test(value) || /%(?:00|0a|0d|5c)/i.test(value)) return null;
  if (value.startsWith('#')) return asset ? null : value;
  const origin = typeof window === 'undefined' ? 'https://cms.local' : window.location.origin;
  try {
    if (value.startsWith('/')) {
      if (/^\/(?:\/|%2f|%5c)/i.test(value)) return null;
      const parsed = new URL(value, origin);
      return parsed.origin === origin ? value : null;
    }
    const parsed = new URL(value);
    if (parsed.username || parsed.password) return null;
    if (internal) return parsed.origin === origin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : null;
    return (asset ? ['https:', 'http:'] : ['https:', 'http:', 'mailto:', 'tel:']).includes(parsed.protocol) ? value : null;
  } catch { return null; }
}

function SafeLink({ to, children, external = false, className, internal = false, ...props }) {
  const href = safeCMSUrl(to, { internal });
  if (!href) return <span className={className}>{children}</span>;
  if (href.startsWith('/') && !external) return <Link to={href} className={className} {...props}>{children}</Link>;
  const newTab = external && /^https?:/i.test(href);
  return <a href={href} className={className} target={newTab ? '_blank' : undefined} rel={newTab ? 'noopener noreferrer nofollow' : undefined} {...props}>{children}</a>;
}
function Action({ value, internal = false }) {
  if (!value?.label || !safeCMSUrl(value.to, { internal })) return null;
  return <SafeLink to={value.to} internal={internal} external={value.external} className={`cms-button cms-button-${choice(value.variant, ['gold', 'ghost', 'outline', 'link'], 'gold')}`}>{text(value.label)}<BrandIcon name="arrow" size={16} /></SafeLink>;
}
function Actions({ primary, secondary, internal = false }) {
  return <div className="cms-actions"><Action value={primary} internal={internal} /><Action value={secondary} internal={internal} /></div>;
}
function Image({ value, className = '', eager = false }) {
  const src = safeCMSUrl(value?.src || value?.url, { asset: true });
  if (!src) return null;
  const dimension = (number) => Number.isInteger(number) && number > 0 && number <= 20000 ? number : undefined;
  const focus = /^(?:\d{1,3}%\s+\d{1,3}%|center|top|bottom|left|right)$/.test(value?.focus || '') ? value.focus : 'center';
  return <img className={`cms-image ${className}`} src={src} alt={text(value?.alt)} width={dimension(value?.width)} height={dimension(value?.height)} loading={eager ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" style={{ objectPosition: focus }} />;
}

/** Presentation-only text extraction, NOT an HTML sanitizer. React escapes the
 * result; neither saved, backend-sanitized HTML nor local drafts enter an HTML sink.
 * A vetted sanitizer is needed if full rich-text formatting is added in future. */
export function cmsPlainText(value) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', bull: '•' };
  return text(value)
    .replace(/<(script|style|iframe|object|embed|svg|math|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<br\s*\/?\s*>|<\/(?:p|div|h[1-6]|blockquote|ul|ol)>/gi, '\n\n')
    .replace(/<li\b[^>]*>/gi, '\n• ').replace(/<[^>]*>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
      if (entity[0] !== '#') return entities[entity.toLowerCase()] ?? match;
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '';
    }).replace(/\n{3,}/g, '\n\n').trim();
}
function RichText({ value, columns = 1, dropCap = false }) {
  return <div className={`cms-richtext${dropCap ? ' cms-drop-cap' : ''}`} style={{ '--cms-columns': choice(Number(columns), [1, 2, 3], 1) }}>{cmsPlainText(value)}</div>;
}
function Heading({ title, sub, eyebrow, accent, align }) {
  if (!title && !sub && !eyebrow) return null;
  return <div className={`cms-heading cms-align-${align === 'center' ? 'center' : 'left'}`}><SectionHead title={text(title)} eyebrow={text(eyebrow)} accent={text(accent)} sub={text(sub)} /></div>;
}
function Bullets({ items }) {
  return list(items).length ? <ul className="cms-bullets">{list(items).map((item, index) => <li key={index}><BrandIcon name="check" size={18} />{text(item)}</li>)}</ul> : null;
}
function Stats({ items }) {
  return <dl className="cms-stats">{list(items).map((item, index) => <div key={index}>{item.icon && <BrandIcon name={item.icon} size={25} />}<dt>{text(item.label)}</dt><dd>{text(item.value)}</dd></div>)}</dl>;
}
function CatalogCard({ item, program = false, showPrice = true }) {
  if (!item || typeof item !== 'object') return null;
  const identity = text(item.legacyId || item.slug || item.id || item._id);
  const to = program ? `/courses?program=${encodeURIComponent(identity)}` : `/course/${encodeURIComponent(identity)}`;
  let price = '';
  if (showPrice && Number.isFinite(Number(item.priceMinor))) {
    try { price = new Intl.NumberFormat('en-US', { style: 'currency', currency: /^[A-Z]{3}$/.test(item.currency) ? item.currency : 'USD' }).format(Number(item.priceMinor) / 100); } catch { price = ''; }
  }
  return <article className="cms-catalog-card"><div className="cms-catalog-art"><Image value={item.coverImage} />{!safeCMSUrl(item.coverImage?.url || item.coverImage?.src, { asset: true }) && <BrandIcon name="lotus" size={65} />}</div>
    <div className="cms-catalog-copy">{item.badge && <span className="cms-eyebrow">{text(item.badge)}</span>}<h3><Link to={to}>{text(item.title)}</Link></h3><p>{text(item.shortDescription)}</p>
      <p className="cms-caption">{[item.level, item.lengthLabel].filter(Boolean).map(text).join(' · ')}</p><div className="cms-catalog-bottom">{price && <strong>{price}</strong>}<Link to={to} className="cms-text-link">{program ? 'Explore programs' : 'Explore course'}<BrandIcon name="arrow" size={16} /></Link></div>
    </div></article>;
}
function CatalogGrid({ data, preview }) {
  const courses = list(data.courses);
  const programs = list(data.programs);
  return <><Heading title={data.heading} sub={data.sub} /><div className={`cms-catalog cms-catalog-${choice(data.layout, ['cards', 'banners', 'list'], 'cards')}`}>
    {(data.source === 'programs' ? programs : courses).map((item, index) => <CatalogCard key={item.id || item._id || index} item={item} program={data.source === 'programs'} showPrice={data.showPrice !== false} />)}
  </div>{data.source === 'programs' && courses.length > 0 && <><h3 className="cms-small-heading">Courses in these programs</h3><div className="cms-catalog cms-catalog-cards">{courses.map((item, index) => <CatalogCard key={item.id || item._id || index} item={item} showPrice={data.showPrice !== false} />)}</div></>}
    {!(data.source === 'programs' ? programs : courses).length && <p className="cms-empty">{preview ? `Local preview: ${data.source === 'programs' ? 'programs and courses' : 'courses'} are resolved from the published catalog on the public page. Draft source: ${text(data.source) || 'published_courses'}.` : 'New learning opportunities will appear here when available.'}</p>}<Actions primary={data.cta} internal /></>;
}
function Testimonials({ data }) {
  const items = list(data.items);
  const [index, setIndex] = useState(0);
  const current = Math.min(index, Math.max(0, items.length - 1));
  const mode = choice(data.layout, ['grid', 'carousel', 'single'], 'carousel');
  const shown = mode === 'grid' ? items : items.slice(mode === 'single' ? 0 : current, (mode === 'single' ? 0 : current) + 1);
  return <><Heading title={data.heading} /><div className={`cms-testimonials cms-testimonials-${mode}`} aria-live={mode === 'carousel' ? 'polite' : 'off'}>{shown.map((item, position) => <figure key={`${current}-${position}`}><blockquote>“{text(item.quote)}”</blockquote><figcaption><Image value={item.avatar} /><div><strong>{text(item.name)}</strong><span>{[item.location, item.courseTitle].filter(Boolean).map(text).join(' · ')}</span></div></figcaption></figure>)}</div>
    {mode === 'carousel' && items.length > 1 && <div className="cms-carousel-controls"><button type="button" className="cms-button cms-button-outline" disabled={current === 0} onClick={() => setIndex(current - 1)} aria-label="Previous testimonial">Previous</button><span>{current + 1} / {items.length}</span><button type="button" className="cms-button cms-button-outline" disabled={current === items.length - 1} onClick={() => setIndex(current + 1)} aria-label="Next testimonial">Next</button></div>}</>;
}
function safeEmbed(provider, value) {
  const hosts = { youtube: ['youtube.com', 'www.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'], vimeo: ['player.vimeo.com'], bunny_public: ['iframe.mediadelivery.net'] };
  const paths = { youtube: /^\/embed\/[\w-]+\/?$/, vimeo: /^\/video\/\d+\/?$/, bunny_public: /^\/embed\/\d+\/[\w-]+\/?$/ };
  if (!safeCMSUrl(value, { asset: true })) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.port || !hosts[provider]?.includes(url.hostname) || !paths[provider]?.test(url.pathname)) return null;
    // Drop query/hash parameters; authors cannot inject player options or redirect URLs.
    return `${url.origin}${url.pathname}`;
  } catch { return null; }
}
function Video({ data, preview }) {
  const [playing, setPlaying] = useState(false);
  const src = safeEmbed(data.provider, data.embedUrl);
  useEffect(() => setPlaying(false), [src]);
  return <figure className="cms-video"><h2>{text(data.title)}</h2><div className="cms-video-stage" style={{ aspectRatio: choice(data.aspectRatio, ['16:9', '4:3', '1:1'], '16:9').replace(':', '/') }}>
    {src && playing && !preview ? <iframe src={src} title={text(data.title) || 'Public video'} loading="lazy" sandbox="allow-scripts allow-same-origin allow-presentation" allow="fullscreen; picture-in-picture" referrerPolicy="no-referrer" allowFullScreen /> : <><Image value={data.poster} /><div className="cms-video-cover"><BrandIcon name="play" size={32} />{preview ? <p>Local draft preview · video playback is disabled.</p> : src ? <button type="button" className="cms-button cms-button-gold" onClick={() => setPlaying(true)}>Load video from {text(data.provider)}</button> : <p>Video unavailable.</p>}</div></>}
  </div>{data.caption && <figcaption>{text(data.caption)}</figcaption>}</figure>;
}
function Announcement({ data, preview }) {
  const [dismissed, setDismissed] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const start = data.startsAt ? Date.parse(data.startsAt) : null;
  const end = data.endsAt ? Date.parse(data.endsAt) : null;
  if (dismissed || (!preview && ((start !== null && (!Number.isFinite(start) || start > now)) || (end !== null && (!Number.isFinite(end) || end <= now))))) return null;
  return <aside className={`cms-callout cms-tone-${choice(data.tone, ['gold', 'blue', 'plum'], 'gold')}`} aria-label="Announcement"><p>{text(data.text)}</p><Action value={data.link} />{preview && (data.startsAt || data.endsAt) && <small>Scheduled announcement (shown regardless of schedule in preview).</small>}{data.dismissible !== false && <button type="button" className="cms-dismiss" aria-label="Dismiss announcement" onClick={() => setDismissed(true)}>×</button>}</aside>;
}
function Countdown({ data, preview }) {
  const series = choice(data.liveClassSeries, ['wednesday_wisdom_call', 'other'], 'wednesday_wisdom_call');
  const resource = useDashboardResource(preview ? null : `/live-classes?scope=upcoming&series=${series}&limit=20`);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { if (preview) return undefined; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [preview]);
  const event = list(resource.data?.liveClasses).filter((item) => !['cancelled', 'ended', 'completed'].includes(item.status) && Date.parse(item.endAt) > now).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))[0];
  const seconds = event ? Math.max(0, Math.floor((Date.parse(event.startAt) - now) / 1000)) : 0;
  let date = '';
  if (event) { try { date = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short', timeZone: data.timeZone || event.timeZone }).format(new Date(event.startAt)); } catch { date = new Date(event.startAt).toLocaleString(); } }
  return <div className="cms-event"><Heading eyebrow={data.eyebrow} title={data.heading} sub={data.body} />
    {preview ? <p className="cms-empty">Local preview · the countdown uses the public live-class schedule, not a hardcoded date.</p> : resource.loading ? <p role="status">Loading the next event…</p> : resource.error ? <div role="status"><p>The live schedule is unavailable.</p><button type="button" className="cms-button cms-button-outline" onClick={resource.reload}>Retry schedule</button></div> : event ? <><h3>{text(event.title)}</h3><time dateTime={event.startAt}>{date}</time>{seconds > 0 ? <div className="cms-countdown" role="timer" aria-live="off">{[[Math.floor(seconds / 86400), 'Days'], [Math.floor(seconds / 3600) % 24, 'Hours'], [Math.floor(seconds / 60) % 60, 'Minutes'], [seconds % 60, 'Seconds']].map(([value, label]) => <div key={label}><b>{String(value).padStart(2, '0')}</b><span>{label}</span></div>)}</div> : <p className="cms-eyebrow">Happening now</p>}</> : <p className="cms-empty">The next live event will be announced here.</p>}
    <ul className="cms-benefits">{list(data.benefits).map((item, index) => <li key={index}><BrandIcon name={item.icon} size={28} /><div><h3>{text(item.title)}</h3><p>{text(item.text)}</p></div></li>)}</ul><Actions primary={data.primary} />
  </div>;
}

/** Explicit allowlisted renderer. Unknown types are never evaluated or rendered as HTML. */
export function CMSBlock({ block, preview = false, heroHeading = 'h1' }) {
  const d = block?.data || {};
  switch (block?.type) {
    case 'hero': { const Title = heroHeading === 'h1' ? 'h1' : 'h2'; return <div className="cms-hero cms-split"><div>{d.eyebrow && <p className="cms-eyebrow">{text(d.eyebrow)}</p>}<Title>{text(d.titleLead)} <span className="cms-accent">{text(d.titleAccent)}</span></Title>{d.lead && <p className="cms-lead">{text(d.lead)}</p>}<Actions primary={d.primary} secondary={d.secondary} /><ul className="cms-features">{list(d.features).map((feature, index) => <li key={index}><BrandIcon name={feature.icon} size={23} />{text(feature.label)}</li>)}</ul>{d.footnote && <p className="cms-caption">{text(d.footnote)}</p>}</div><Image value={d.image} eager /></div>; }
    case 'section_head': return <Heading eyebrow={d.eyebrow} title={d.title} accent={d.accent} sub={d.sub} align={d.align} />;
    case 'text': return <><Heading title={d.heading} /><RichText value={d.body} columns={d.columns} dropCap={d.dropCap} /></>;
    case 'image': return <figure className="cms-figure" style={d.ratio && d.ratio !== 'auto' ? { '--cms-ratio': choice(d.ratio, ['16:9', '4:3', '1:1', '3:4'], '16:9').replace(':', '/') } : undefined}><Image value={d.image} />{d.caption && <figcaption>{text(d.caption)}</figcaption>}</figure>;
    case 'image_text': return <div className={`cms-split${d.imagePosition === 'right' ? ' cms-image-right' : ''}`}><Image value={d.image} /><div><Heading title={d.heading} /><RichText value={d.body} /><Bullets items={d.bullets} /><Actions primary={d.primary} /></div></div>;
    case 'course_grid': return <CatalogGrid data={d} preview={preview} />;
    case 'featured_course': return <div className="cms-featured">{d.eyebrow && <p className="cms-eyebrow">{text(d.eyebrow)}</p>}{d.course ? <CatalogCard item={d.course} /> : <p className="cms-empty">{preview ? `Local preview · featured course ${text(d.courseId) || '(not selected)'} is resolved from the published catalog.` : 'This course is not currently available.'}</p>}<Bullets items={d.highlight} /><Actions primary={d.cta} internal /></div>;
    case 'testimonials': return <Testimonials data={d} />;
    case 'instructor': return <div className="cms-split cms-instructor"><Image value={d.portrait} /><div><p className="cms-eyebrow">{text(d.title)}</p><h2>{text(d.name)}</h2><RichText value={d.bio} /><Bullets items={d.credentials} />{d.quote && <blockquote className="cms-pullquote">“{text(d.quote)}”</blockquote>}<div className="cms-actions">{list(d.links).map((link, index) => <Action key={index} value={link} />)}</div></div></div>;
    case 'cta': return <div className={`cms-callout cms-tone-${choice(d.tone, ['plum', 'blue', 'gold', 'ivory'], 'plum')}`}><Heading eyebrow={d.eyebrow} title={d.heading} sub={d.body} /><Actions primary={d.primary} secondary={d.secondary} /></div>;
    case 'faq': return <><Heading title={d.heading} sub={d.sub} />{d.groupKey && <p className="cms-eyebrow">{text(d.groupKey)}</p>}<div className={`cms-faq cms-faq-${d.layout === 'grouped' ? 'grouped' : 'accordion'}`}>{list(d.items).map((item, index) => d.layout === 'grouped' ? <article key={index}><h3>{text(item.q)}</h3><RichText value={item.a} /></article> : <details key={index}><summary>{text(item.q)}</summary><RichText value={item.a} /></details>)}</div></>;
    case 'video_embed': return <Video data={d} preview={preview} />;
    case 'book_block': return <div className="cms-split cms-book"><div className="cms-book-covers"><Image value={d.covers?.front} /><Image value={d.covers?.back} /></div><div><p className="cms-eyebrow">{text(d.author)}</p><h2>{text(d.title)}</h2>{d.subtitle && <h3>{text(d.subtitle)}</h3>}<p>{text(d.blurb)}</p><ul className="cms-chips">{list(d.formats).map((format, index) => <li key={index}>{text(format)}</li>)}</ul><Actions primary={{ label: 'Explore this resource', to: safeCMSUrl(d.purchaseUrl, { internal: true }) || '/books' }} internal />{preview && d.purchaseUrl && !safeCMSUrl(d.purchaseUrl, { internal: true }) && <p className="cms-caption">External purchase URL not used. Product links stay on this site.</p>}</div></div>;
    case 'community_banner': return <div className="cms-community"><div className="cms-split"><div><Heading eyebrow={d.eyebrow} title={d.heading} sub={d.body} /><Actions primary={d.primary} secondary={d.secondary} /></div><Image value={d.image} /></div><Stats items={d.stats} /></div>;
    case 'announcement': return <Announcement data={d} preview={preview} />;
    case 'footer_content': return <div className="cms-footer-content">{d.blurb && <p className="cms-lead">{text(d.blurb)}</p>}<div className="cms-footer-columns">{list(d.columns).map((column, index) => <nav key={index} aria-label={text(column.heading) || `Footer links ${index + 1}`}><h3>{text(column.heading)}</h3><ul>{list(column.links).map((link, i) => <li key={i}><SafeLink to={link.to} external={link.external}>{text(link.label)}</SafeLink></li>)}</ul></nav>)}{d.contact && <address>{d.contact.email && <p><SafeLink to={`mailto:${text(d.contact.email)}`}>{text(d.contact.email)}</SafeLink></p>}{d.contact.phone && <p><SafeLink to={`tel:${text(d.contact.phone).replace(/[\s()-]/g, '')}`}>{text(d.contact.phone)}</SafeLink></p>}<p>{text(d.contact.address)}</p></address>}</div><div className="cms-actions">{list(d.socials).map((social, index) => <SafeLink key={index} to={social.url} external className="cms-text-link">{text(social.label)}</SafeLink>)}</div><div className="cms-footer-bottom"><p>{text(d.credit)}</p><nav aria-label="Legal links">{list(d.legalLinks).map((link, index) => <SafeLink key={index} to={link.to} external={link.external}>{text(link.label)}</SafeLink>)}</nav></div></div>;
    case 'navigation': return <nav className="cms-navigation" aria-label={`${text(d.group) || 'Page'} navigation`}><ul>{list(d.items).filter((item) => item.visible !== false).map((item, index) => <li key={index}><SafeLink to={item.to}>{text(item.label)}</SafeLink>{list(item.children).length > 0 && <ul>{item.children.map((child, i) => <li key={i}><SafeLink to={child.to}>{text(child.label)}</SafeLink></li>)}</ul>}</li>)}</ul></nav>;
    case 'stats': return <Stats items={d.items} />;
    case 'divider': return <div className="cms-divider" style={{ minHeight: Math.min(200, Math.max(0, Number(d.height) || 0)) }} aria-hidden="true">{d.style === 'ornament' ? <SectionDivider /> : d.style === 'spacer' ? null : <hr />}</div>;
    case 'quote': return <figure className="cms-quote"><blockquote>“{text(d.text)}”</blockquote>{d.attribution && <figcaption>— {text(d.attribution)}</figcaption>}</figure>;
    case 'countdown': return <Countdown data={d} preview={preview} />;
    default: return preview ? <p className="cms-empty">Unsupported block type: {text(block?.type)}. The public renderer omits this block.</p> : null;
  }
}

/** Pass only API-published blocks in public views; preview=true accepts local drafts. */
export function CMSBlocks({ blocks = [], preview = false, className = '', heroHeading = 'h1' }) {
  const visible = list(blocks).filter((block) => block && block.visible !== false).slice().sort((a, b) => (Number(a.orderIndex) || 0) - (Number(b.orderIndex) || 0));
  let heroSeen = false;
  return <div className={`cms-blocks ${className}`}>{visible.map((block, index) => {
    if (!CMS_BLOCK_TYPES.includes(block.type) && !preview) return null;
    const settings = block.settings || {};
    const firstHero = block.type === 'hero' && !heroSeen;
    if (block.type === 'hero') heroSeen = true;
    const background = choice(settings.background, ['plum', 'blue', 'ivory', 'lavender', 'white', 'transparent'], 'transparent');
    return <section key={block.key || `${block.type}-${index}`} className={`cms-section cms-bg-${background} cms-pad-${choice(settings.padding, ['compact', 'normal', 'roomy'], 'normal')} cms-width-${choice(settings.maxWidth, ['narrow', 'normal', 'wide', 'full'], 'normal')}`} data-cms-block={block.type}>
      <div className="cms-section-inner"><CMSBlock block={block} preview={preview} heroHeading={firstHero ? heroHeading : 'h2'} /></div>
    </section>;
  })}</div>;
}
export default CMSBlocks;
