import { lazy, Suspense, useRef, useState } from 'react';
import { Icon } from './icons';
import { bunnyAudioUrl } from '../data/audiobooks';

/* hls.js is by far the largest thing the players pull in, and it is only ever
   needed by a video. Loaded here rather than at the top of the module, an
   audiobook page ships the audio player without the video engine, and a page
   that never opens a film never asks for it. */
const HlsVideoPlayer = lazy(() => import('./HlsVideoPlayer'));

/* Where a recording comes from. Bunny Stream is the source: data/audiobooks.js
   holds Stream's own id for each of the 18 files, and that resolves first. The
   '/media' copy under the repo root is what still plays a row whose Stream id is
   not recorded yet, so no card is ever left with a dead player. VITE_AUDIO_BASE
   overrides that fallback for a self-hosted deploy
   (`npm run build && npm run stage:media`). Absolute urls pass through untouched,
   which is how the meditation films arrive. */
const AUDIO_BASE = (import.meta.env.VITE_AUDIO_BASE || '/media').replace(/\/+$/, '');

export const mediaUrl = (src) =>
  bunnyAudioUrl(src) || (/^https?:/.test(src) ? src : `${AUDIO_BASE}/${encodeURI(src)}`);

const noSave = (e) => e.preventDefault();

const TRACK_NOTE = 'Listen to this teaching from The Centre for Transformation';

// One card per recording: his own play button for the glance, the browser's
// transport bar under it for scrubbing and volume. Starting a track silences
// the others so two recordings can never talk over each other.
function AudioTrackCard({ track, note, players }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      players.current.forEach((other) => { if (other !== el) other.pause(); });
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  return (
    <li className="audio-card">
      <div className="audio-card-top">
        <button
          type="button"
          className="audio-card-btn"
          onClick={toggle}
          aria-label={`${playing ? 'Pause' : 'Play'} ${track.title}`}
        >
          <Icon name={playing ? 'pause' : 'play'} size={16} style={{ fill: 'currentColor' }} />
        </button>
        <div className="audio-card-copy">
          <h3>{track.title}</h3>
          <p>{note}</p>
        </div>
      </div>
      <audio
        ref={(el) => {
          ref.current = el;
          if (el) players.current.set(track.src, el);
          else players.current.delete(track.src);
        }}
        src={mediaUrl(track.src)}
        controls
        preload="metadata"
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={noSave}
        onDragStart={noSave}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </li>
  );
}

export function AudioPlaylist({ audio }) {
  const players = useRef(new Map());
  const note = audio.note || TRACK_NOTE;
  let n = 0;
  const groups = audio.groups.map((g) => ({
    label: g.label,
    tracks: g.tracks.map((t) => ({ ...t, title: `Audio Track ${++n}` })),
  }));

  return (
    <div className="audio-stack">
      {groups.map((g) => (
        <div className="audio-group" key={g.label || g.tracks[0].src}>
          {g.label ? <p className="audio-group-label">{g.label}</p> : null}
          <ul className="audio-list">
            {g.tracks.map((t) => (
              <AudioTrackCard key={t.src} track={t} note={note} players={players} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

// A video slot that already looks finished before the file arrives: same 16:9
// frame, same transport affordance, with a note instead of a broken player.
// When the HLS source is set, it hands off to the custom HlsVideoPlayer so
// every control (play/pause, skip, CC, volume, fullscreen) lives inside the frame.
export function VideoSlot({ src, poster, title, guid, autoPlay }) {
  if (!src) {
    return (
      <figure className="video-slot is-empty">
        <span className="video-slot-play" aria-hidden="true">
          <Icon name="play" size={22} />
        </span>
        <figcaption className="video-slot-note">
          <b>Video coming soon</b>
          <span>The film for this part is being prepared. It will play right here.</span>
        </figcaption>
      </figure>
    );
  }
  return (
    <Suspense fallback={<span className="video-slot" aria-hidden="true" />}>
      <HlsVideoPlayer src={src} poster={poster} title={title} guid={guid} autoPlay={autoPlay} />
    </Suspense>
  );
}
