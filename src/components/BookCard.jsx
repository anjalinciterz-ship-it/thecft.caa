import { Link } from 'react-router-dom';
import { Icon } from './icons';
import { SkeletonImage } from './Skeleton';

const trackCount = (book) =>
  book.audio ? book.audio.groups.reduce((n, g) => n + g.tracks.length, 0) : 0;

export default function BookCard({ book }) {
  const tracks = trackCount(book);
  return (
    <Link to={`/books/${book.slug}`} className="book-card">
      <div className="book-card-cover">
        <SkeletonImage
          src={book.cover.frontSmall}
          srcSet={`${book.cover.frontSmall} 560w, ${book.cover.front} 1024w`}
          sizes="(max-width: 640px) 80vw, (max-width: 980px) 45vw, 370px"
          alt={`${book.title} front cover`}
          loading="lazy"
        />
      </div>
      <div className="book-card-body">
        <span className="num">{book.num}</span>
        <h3>{book.title}</h3>
        <p className="by">Author: {book.author}</p>
        <p className="blurb">{book.blurb}</p>
        {tracks ? <p className="book-card-tracks">{tracks} audio tracks</p> : null}
        <span className="card-cta">
          Learn More <Icon name="arrow" size={16} />
        </span>
      </div>
    </Link>
  );
}
