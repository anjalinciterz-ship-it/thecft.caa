import { lazy, Suspense, useRef, useState } from 'react';
import { Icon } from './icons';

/* hls.js is by far the largest thing the players pull in, and it is only ever
   needed by a video. Loaded here rather than at the top of the module, an
   audiobook page ships the audio player without the video engine, and a page
   that never opens a film never asks for it. */
const HlsVideoPlayer = lazy(() => import('./HlsVideoPlayer'));

/* The recordings ship inside the bundle. `npm run build` copies the repo-root
   media folder into dist, so a deployed player asks for /media/<file> and
   Netlify serves the mp3 itself with byte ranges. Bunny Stream was dropped for
   book audio on 2026-11-18; it still carries the films, which arrive as absolute
   urls from the data files and pass through here untouched. */
export const mediaUrl = (src) => {
  if (/^https?:/.test(src)) return src;
  /* encodeURI leaves ?, #, & and + as they are, so a recording named with any of
     them asks for half a path or a query nobody meant. Escaping one segment at a
     time is the only form that cannot be misread by a carrier, a proxy or the
     browser itself. */
  return `/media/${src.split('/').map(encodeURIComponent).join('/')}`;
};

const noSave = (e) => e.preventDefault();

const TRACK_NOTE = 'Listen to this teaching from The Centre for Transformation';
const TROUBLE_NOTE =
  'This recording is not reaching us right now. Tap play to try once more, or write to us and we will send it to you directly.';

// One card per recording: his own play button for the glance, the browser's
// transport bar under it for scrubbing and volume. Starting a track hands the
// others their place on the shelf, so two recordings can never talk over each
// other and only one of them is ever holding the browser's attention.
function AudioTrackCard({ track, note, players, positions, handOver }) {
  const ref = useRef(null);
  const seekTo = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [trouble, setTrouble] = useState(false);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    /* A recording that failed once stays failed: `src` never changed, so no
       engine goes back for the bytes on its own, and the card looks dead until
       the page reloads. That is what a phone hits when its request dies at
       handover, and it is what every device that opened these pages during the
       November 16 to 18 deploy window hit, when the fallback document answered
       for the file. Re-arming the element is the whole fix. */
    if (el.error || el.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      setTrouble(false);
      el.load();
    }
    // If this card had been handed back to make room for another one, go on
    // where the listener left it rather than at the start of the chapter.
    const back = positions.current.get(track.src) || 0;
    positions.current.delete(track.src);
    if (back > 0.5) {
      if (el.readyState >= HTMLMediaElement.HAVE_METADATA) el.currentTime = back;
      else seekTo.current = back;
    }
    el.play().catch((err) => {
      // The browser wanting a tap of its own is not a broken recording, and the
      // transport bar under this line always gives it one.
      if (err && err.name === 'NotAllowedError') return;
      setTrouble(true);
    });
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
      {/* preload="none", not "metadata": with ten recordings on one page,
          metadata meant ten media players and ten range requests the moment the
          page opened. A handset does not forgive that; a laptop never noticed. */}
      <audio
        ref={(el) => {
          ref.current = el;
          if (el) players.current.set(track.src, el);
          else players.current.delete(track.src);
        }}
        src={mediaUrl(track.src)}
        controls
        preload="none"
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={noSave}
        onDragStart={noSave}
        onError={() => setTrouble(true)}
        onPlaying={() => setTrouble(false)}
        onPlay={() => {
          setPlaying(true);
          handOver(track.src);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={() => {
          if (seekTo.current > 0.5 && ref.current) ref.current.currentTime = seekTo.current;
          seekTo.current = 0;
        }}
      />
      {trouble ? (
        <p className="audio-card-trouble" role="status">
          {TROUBLE_NOTE}
        </p>
      ) : null}
    </li>
  );
}

export function AudioPlaylist({ audio }) {
  const players = useRef(new Map());
  const positions = useRef(new Map());

  /* A browser keeps only a handful of live media connections to one host, and an
     <audio> element holds its place in that queue even after you pause it, so on a
     page with ten recordings the seventh one a visitor taps never gets its bytes.
     The element says it is playing and stays silent, which is exactly the report
     this fixes. Everything that is not the track being started gives its resource
     back, remembering where it was, and there is always a free connection for the
     one that is wanted. Hooked to the play event rather than to the button so it
     also covers a start from the browser's own transport bar. */
  const handOver = (starting) => {
    players.current.forEach((el, src) => {
      if (src === starting) return;
      if (el.networkState === HTMLMediaElement.NETWORK_EMPTY) return;
      // Never fetched, never released: there is nothing here to give back.
      if (!el.currentSrc && el.readyState === HTMLMediaElement.HAVE_NOTHING) return;
      if (!el.paused) el.pause();
      if (el.currentTime > 0.5 && !el.ended) positions.current.set(src, el.currentTime);
      else positions.current.delete(src);
      el.load();
    });
  };

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
              <AudioTrackCard
                key={t.src}
                track={t}
                note={note}
                players={players}
                positions={positions}
                handOver={handOver}
              />
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
