import { useEffect, useRef, useState } from 'react';
import { Icon } from './icons';

// The single seam between the players and wherever the bytes come from. Today
// the dev server streams /media/<id>; once enforcement is decided this becomes
// a request for a short-lived signed URL from the backend.
export const mediaUrl = (src) => `/media/${src}`;

const noSave = (e) => e.preventDefault();

const clock = (s) => {
  if (!Number.isFinite(s) || s <= 0) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
};

export function AudioPlaylist({ audio }) {
  const [active, setActive] = useState(audio.groups[0].tracks[0].src);
  const [playing, setPlaying] = useState(false);
  const [length, setLength] = useState(null);
  const ref = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return undefined;
    }
    const el = ref.current;
    setLength(null);
    el.load();
    el.play().catch(() => {});
    return () => el.pause();
  }, [active]);

  const pick = (src) => {
    if (src !== active) return setActive(src);
    const el = ref.current;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  const rows = [];
  audio.groups.forEach((g) => {
    if (g.label) rows.push({ kind: 'group', label: g.label });
    g.tracks.forEach((t) => rows.push({ kind: 'track', label: t.label, src: t.src }));
  });

  return (
    <div className="glass media-card">
      <div className="media-head">
        <span className="media-mark">
          <Icon name="headphones" size={20} />
        </span>
        <div>
          <h3>{audio.heading}</h3>
        </div>
      </div>

      <ul className="track-list">
        {rows.map((r) =>
          r.kind === 'group' ? (
            <li key={`group-${r.label}`} className="track-group">
              {r.label}
            </li>
          ) : (
            <li key={r.src}>
              <button
                type="button"
                className={`track${r.src === active ? ' is-active' : ''}`}
                onClick={() => pick(r.src)}
              >
                <span className="track-glyph">
                  <Icon name={r.src === active && playing ? 'pause' : 'play'} size={14} />
                </span>
                <span className="track-label">{r.label}</span>
                <span className="track-len">
                  {r.src === active && length ? clock(length) : ''}
                </span>
              </button>
            </li>
          )
        )}
      </ul>

      <audio
        ref={ref}
        className="media-audio"
        src={mediaUrl(active)}
        controls
        preload="none"
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={noSave}
        onDragStart={noSave}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => setLength(e.currentTarget.duration)}
      />
    </div>
  );
}

export function ProtectedVideo({ title, video }) {
  return (
    <div className="glass media-card">
      <div className="media-head">
        <span className="media-mark">
          <Icon name="film" size={20} />
        </span>
        <div>
          <h3>{title}</h3>
        </div>
      </div>
      <video
        className="media-video"
        src={mediaUrl(video.src)}
        poster={video.poster || undefined}
        controls
        preload="none"
        playsInline
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={noSave}
        onDragStart={noSave}
      />
    </div>
  );
}
