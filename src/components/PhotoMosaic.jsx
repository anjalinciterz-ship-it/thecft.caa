import { useCallback, useEffect, useRef, useState } from 'react';

/* A wall of the real photographs used across the site. Every tile opens the
   same picture full-size, with arrow keys to move through the rest. */

export const ABOUT_PHOTOS = [
  { src: '/images/photos/signpost.webp', caption: 'Every direction is a choice.', alt: 'A wooden signpost with many arms standing in a desert.' },
  { src: '/images/photos/horizon-back.webp', caption: 'A wider sky.', alt: 'A person seen from behind, looking up at a bright open sky.' },
  { src: '/images/photos/jar-plant.webp', caption: 'Something to hold on to.', alt: 'A person holding a glass jar with a green cutting in it.' },
  { src: '/images/photos/walking-path.webp', caption: 'One step, then another.', alt: 'A child with a backpack walking away along a gravel path.' },
  { src: '/images/photos/leaves-peek.webp', caption: 'Curiosity.', alt: 'A face partly hidden behind green leaves in warm light.' },
  { src: '/images/photos/salt-flat.webp', caption: 'Open ground.', alt: 'A person standing alone on a cracked salt flat under a wide sky.' },
  { src: '/images/photos/cap-shadow.webp', caption: 'Light and shade.', alt: 'A white cap hanging on a sunlit wall, throwing a long shadow.' },
  { src: '/images/photos/shadow-figure.webp', caption: 'The part we carry.', alt: 'The shadow of a person cast on sunlit pavement.' },
];

export default function PhotoMosaic({ eyebrow, title, accent, sub, photos = ABOUT_PHOTOS }) {
  const [open, setOpen] = useState(-1);
  const grid = useRef(null);
  const box = useRef(null);

  const move = useCallback((step) => {
    setOpen((current) => (current < 0 ? current : (current + step + photos.length) % photos.length));
  }, [photos.length]);

  // Closing hands focus back to the tile that opened the viewer, not the top of the page.
  const close = useCallback(() => {
    const tile = grid.current?.querySelectorAll('button')[open];
    setOpen(-1);
    tile?.focus();
  }, [open]);

  useEffect(() => {
    if (open < 0) return undefined;
    box.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') move(1);
      if (event.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, move, close]);

  return (
    <div className="ab-mosaic-wrap">
      <span className="cq-eyebrow">{eyebrow}</span>
      <h2 className="cq-h2">
        {title} {accent && <span>{accent}</span>}
      </h2>
      {sub && <p className="cq-lead">{sub}</p>}
      <div className="ab-mosaic" ref={grid}>
        {photos.map((photo, index) => (
          <button
            key={photo.src}
            type="button"
            className={`ab-tile ab-tile-${(index % 4) + 1}`}
            onClick={() => setOpen(index)}
            aria-label={`View the photograph: ${photo.caption}`}
          >
            <img src={photo.src} alt={photo.alt} loading="lazy" />
            <span className="ab-tile-cap">{photo.caption}</span>
          </button>
        ))}
      </div>
      {open >= 0 && (
        <div className="ab-light" onClick={close}>
          <div
            className="ab-light-box"
            role="dialog"
            aria-modal="true"
            aria-label={photos[open].caption}
            tabIndex={-1}
            ref={box}
            onClick={(event) => event.stopPropagation()}
          >
            <img src={photos[open].src} alt={photos[open].alt} />
            <p>{photos[open].caption}</p>
            <div className="ab-light-bar">
              <span>{open + 1} of {photos.length}</span>
              <div>
                <button type="button" onClick={() => move(-1)} aria-label="Previous photograph">←</button>
                <button type="button" onClick={close} aria-label="Close the photograph">Close</button>
                <button type="button" onClick={() => move(1)} aria-label="Next photograph">→</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
