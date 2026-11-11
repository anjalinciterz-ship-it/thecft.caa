import { useRef, useState } from 'react';
import { Icon } from './icons';
import HlsVideoPlayer from './HlsVideoPlayer';

// The single seam between the players and wherever the bytes come from. The
// audiobooks are published as static files from public/media, so '/media' is a
// real path on the deployed site and in the dev server alike. Point this at a
// CDN hostname instead if the files ever move to Bunny's delivery network.
// Absolute urls pass through untouched.
const AUDIO_BASE = '/media';

export const mediaUrl = (src) => (/^https?:/.test(src) ? src : `${AUDIO_BASE}/${encodeURI(src)}`);

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
export function VideoSlot({ src, poster, title, guid }) {
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
  return <HlsVideoPlayer src={src} poster={poster} title={title} guid={guid} />;
}
