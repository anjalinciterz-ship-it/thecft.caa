import { useState } from 'react';
import { Link } from 'react-router-dom';
import { books, meditation } from '../data/books';
import { mediaUrl } from '../components/ProtectedMedia';
import { DashIcon, PageHeading, safeImage } from '../components/DashboardUI';

const noSave = (event) => event.preventDefault();

function trackRows(audio) {
  const rows = [];
  for (const group of audio.groups) {
    if (group.label) rows.push({ kind: 'group', label: group.label });
    for (const track of group.tracks) rows.push({ kind: 'track', label: track.label, src: track.src });
  }
  return rows;
}

function AudioLibrary({ audio }) {
  const rows = trackRows(audio);
  const first = rows.find((row) => row.src);
  const [active, setActive] = useState(first ? first.src : '');
  const [trouble, setTrouble] = useState(false);
  if (!first) return <p className="db-muted">The recordings for this title are being prepared.</p>;
  return <div className="db-library-player">
    <ul className="db-tracks">{rows.map((row) => row.kind === 'group'
      ? <li className="db-track-group" key={`group-${row.label}`}>{row.label}</li>
      : <li key={row.src}><button type="button" className={`db-track${row.src === active ? ' is-active' : ''}`} aria-pressed={row.src === active} onClick={() => { setActive(row.src); setTrouble(false); }}><DashIcon name="play" size={13} />{row.label}</button></li>)}
    </ul>
    <audio controls src={mediaUrl(active)} preload="none" controlsList="nodownload noremoteplayback" onContextMenu={noSave} onDragStart={noSave} onError={() => setTrouble(true)} />
    {trouble && <p className="db-muted" role="status">This recording isn’t reaching us right now. Try again in a moment, or write to support and we’ll send it to you directly.</p>}
  </div>;
}

export function FreeBooks() {
  return <div className="db-stack">
    <PageHeading eyebrow="Included with your membership" title="Free Books" action={<Link className="db-button-secondary" to="/books">See the shelf on the website<DashIcon name="external" size={15} /></Link>}>The writings of Zalah, open to every member at your own pace.</PageHeading>

    {books.map((book) => <article className="db-panel db-library-book" key={book.slug}>
      {safeImage(book.cover?.front) ? <img className="db-library-cover" src={safeImage(book.cover.front)} alt={`Front cover of ${book.title}`} /> : <span className="db-icon-ring"><DashIcon name="lotus" size={29} /></span>}
      <div className="db-stack">
        <div><span className="db-eyebrow">{book.num}</span><h2>{book.title}</h2><p className="db-muted">{book.subtitle}</p></div>
        <p>{book.blurb}</p>
        {book.audio ? <><h3>{book.audio.heading}</h3><AudioLibrary audio={book.audio} /></> : <p className="db-muted">The audiobook for this title is being prepared.</p>}
        <Link className="db-text-link" to={`/books/${encodeURIComponent(book.slug)}`}>Read about this book on the website<DashIcon name="arrow" size={15} /></Link>
      </div>
    </article>)}

    <section className="db-panel db-stack db-panel-narrow">
      <div><span className="db-eyebrow">{meditation.kind}</span><h2>{meditation.title}</h2></div>
      <p className="db-muted">{meditation.intro}</p>
      {meditation.parts.map((part) => <div className="db-stack" key={part.num}>
        <h3>{part.heading}</h3>
        {part.src
          ? <video className="db-library-video" src={mediaUrl(part.src)} poster={part.poster || undefined} controls preload="none" playsInline controlsList="nodownload noremoteplayback" onContextMenu={noSave} onDragStart={noSave} />
          : <p className="db-muted">The film for this part is being prepared. It will play right here.</p>}
      </div>)}
    </section>
  </div>;
}
