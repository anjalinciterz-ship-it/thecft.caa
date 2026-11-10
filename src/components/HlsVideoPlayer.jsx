import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const clock = (s) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
};

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

const PlayIcon = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z" /></svg>;
const PauseIcon = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>;
const VolumeIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3z" /><path {...stroke} d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" /></svg>;
const MuteIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3z" /><path {...stroke} d="m16 9 5 6M21 9l-5 6" /></svg>;
const ExpandIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>;
const CompressIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" {...stroke} aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M8 21v-3a2 2 0 0 0-2-2H3M16 21v-3a2 2 0 0 1 2-2h3" /></svg>;
const SkipIcon = ({ back = false }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={back ? { transform: 'scaleX(-1)' } : undefined}>
    <path {...stroke} d="M12 4V1.5L7.5 5.5 12 9.5V7a5.5 5.5 0 1 1-5.5 5.5" />
    <text x="12" y="15.4" textAnchor="middle" fontSize="7.6" fontWeight="700" fill="currentColor" stroke="none">10</text>
  </svg>
);

// A self-contained HLS player for the public meditation films. The bytes come
// straight from Bunny's referrer-locked CDN (any browser referrer is allowed),
// hls.js bridges MSE browsers, and every control lives inside the frame.
export default function HlsVideoPlayer({ src, poster, title, guid }) {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  const hlsRef = useRef(null);
  const hideTimer = useRef(null);
  const cuesRef = useRef([]);
  const ccRef = useRef(false);

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState('');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [cues, setCues] = useState([]);
  const [activeCue, setActiveCue] = useState('');
  const [ccEnabled, setCcEnabled] = useState(false);
  const [ccNote, setCcNote] = useState('');

  useEffect(() => { cuesRef.current = cues; }, [cues]);
  useEffect(() => { ccRef.current = ccEnabled; if (!ccEnabled) setActiveCue(''); }, [ccEnabled]);
  useEffect(() => {
    if (!ccNote) return undefined;
    const t = window.setTimeout(() => setCcNote(''), 4000);
    return () => window.clearTimeout(t);
  }, [ccNote]);

  useEffect(() => {
    setCues([]); setActiveCue(''); setCcEnabled(false); setCcNote('');
    if (!guid) return undefined;
    let active = true;
    fetch(`/captions/${encodeURIComponent(guid)}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (active && Array.isArray(data)) setCues(data); })
      .catch(() => {});
    return () => { active = false; };
  }, [guid]);

  const attach = useCallback(() => {
    const video = videoRef.current;
    if (!video || !src) return undefined;
    setError('');
    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30, enableWorker: true });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        else setError('This video could not be loaded. Please check your connection and try again.');
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => { hls.destroy(); hlsRef.current = null; };
    }
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return () => { video.removeAttribute('src'); video.load(); };
    }
    setError('This browser cannot play the video. Please try a modern browser.');
    return undefined;
  }, [src]);

  useEffect(() => attach(), [attach]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused && !v.ended) setControlsVisible(false);
    }, 2800);
  }, []);

  useEffect(() => {
    if (!playing) { setControlsVisible(true); window.clearTimeout(hideTimer.current); }
    else revealControls();
  }, [playing, revealControls]);

  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  const begin = () => {
    setStarted(true);
    setEnded(false);
    const v = videoRef.current;
    if (v) v.play().catch(() => setError('The video could not start. Please press play again.'));
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!started || v.ended) { if (v.ended) v.currentTime = 0; begin(); return; }
    if (v.paused) v.play().catch(() => {}); else v.pause();
  };

  const skip = (delta) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration)) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration);
    revealControls();
  };

  const seekTo = (value) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = value;
    setCurrent(value);
  };

  const toggleMute = () => { const v = videoRef.current; if (v) v.muted = !v.muted; };
  const changeVolume = (value) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = value;
    v.muted = value === 0;
  };

  const toggleCC = () => {
    if (!cues.length) { setCcNote('English captions are not available for this video yet.'); return; }
    setCcNote('');
    setCcEnabled((value) => !value);
  };

  const toggleFullscreen = () => {
    const el = frameRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.().catch(() => {});
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrent(v.currentTime);
    if (ccRef.current) {
      const cue = cuesRef.current.find((c) => v.currentTime >= c.start && v.currentTime < c.end);
      setActiveCue((prev) => { const text = cue ? cue.text : ''; return prev === text ? prev : text; });
    }
    if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
  };

  const onKeyDown = (event) => {
    if (event.target.tagName === 'INPUT' && event.target.type === 'range' && ['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    switch (event.key) {
      case ' ': case 'k': event.preventDefault(); togglePlay(); break;
      case 'ArrowLeft': event.preventDefault(); skip(-10); break;
      case 'ArrowRight': event.preventDefault(); skip(10); break;
      case 'f': toggleFullscreen(); break;
      case 'm': toggleMute(); break;
      case 'c': toggleCC(); break;
      default: return;
    }
    revealControls();
  };

  const retry = () => { setError(''); attach(); setStarted(false); };

  const progress = duration ? (current / duration) * 100 : 0;
  const bufferPct = duration ? Math.min(100, (buffered / duration) * 100) : 0;
  const showPoster = !started || ended;
  const controlsHidden = started && !showPoster && !controlsVisible && !error;

  return (
    <div
      ref={frameRef}
      className={`hx-player${fullscreen ? ' is-fullscreen' : ''}${controlsHidden ? ' is-idle' : ''}`}
      onMouseMove={revealControls}
      onTouchStart={revealControls}
      onFocusCapture={revealControls}
      onKeyDown={onKeyDown}
      tabIndex={0}
      role="region"
      aria-label={title || 'Meditation video'}
      data-playing={playing}
    >
      <video
        ref={videoRef}
        className="hx-video"
        playsInline
        preload="metadata"
        poster={poster || undefined}
        onClick={togglePlay}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => { setPlaying(true); setEnded(false); }}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setEnded(true); }}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => setBuffering(false)}
        onVolumeChange={(e) => { setMuted(e.currentTarget.muted); setVolume(e.currentTarget.volume); }}
        onContextMenu={(e) => e.preventDefault()}
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
      />

      {started && buffering && !error && <span className="hx-spinner" aria-hidden="true" />}

      {ccEnabled && activeCue && (
        <div className="hx-cue" aria-live="polite"><span>{activeCue}</span></div>
      )}

      {showPoster && !error && (
        <button type="button" className="hx-poster" onClick={begin} aria-label={ended ? `Watch again: ${title}` : `Play: ${title}`}>
          {poster && <img src={poster} alt="" aria-hidden="true" />}
          <span className="hx-poster-scrim" aria-hidden="true" />
          <span className="hx-big-play" aria-hidden="true"><PlayIcon /></span>
          <span className="hx-poster-label">{ended ? 'Watch again' : 'Play video'}</span>
        </button>
      )}

      {error && (
        <div className="hx-error" role="alert">
          <p>{error}</p>
          <button type="button" className="hx-retry" onClick={retry}>Try again</button>
        </div>
      )}

      {started && !error && (
        <div className={`hx-controls${controlsHidden ? ' is-hidden' : ''}`}>
          <div className="hx-seek-wrap">
            <div className="hx-seek-track" aria-hidden="true">
              <span className="hx-seek-buffer" style={{ width: `${bufferPct}%` }} />
              <span className="hx-seek-fill" style={{ width: `${progress}%` }} />
            </div>
            <input
              className="hx-seek"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={current}
              aria-label="Seek"
              aria-valuetext={`${clock(current)} of ${clock(duration)}`}
              onChange={(e) => seekTo(Number(e.target.value))}
            />
          </div>
          <div className="hx-bar">
            <button type="button" className="hx-btn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} title={playing ? 'Pause (k)' : 'Play (k)'}>
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button type="button" className="hx-btn" onClick={() => skip(-10)} aria-label="Skip back 10 seconds" title="Back 10s (←)"><SkipIcon back /></button>
            <button type="button" className="hx-btn" onClick={() => skip(10)} aria-label="Skip forward 10 seconds" title="Forward 10s (→)"><SkipIcon /></button>
            <span className="hx-time">{clock(current)} <span className="hx-time-sep">/</span> {clock(duration)}</span>
            <span className="hx-spacer" />
            <div className="hx-volume">
              <button type="button" className="hx-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute (m)' : 'Mute (m)'}>
                {muted || volume === 0 ? <MuteIcon /> : <VolumeIcon />}
              </button>
              <input
                className="hx-volume-range"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                aria-label="Volume"
                onChange={(e) => changeVolume(Number(e.target.value))}
              />
            </div>
            <button type="button" className={`hx-btn hx-cc${ccEnabled ? ' is-on' : ''}`} onClick={toggleCC} aria-label="Toggle English captions" aria-pressed={ccEnabled} title="Captions (c)">CC</button>
            <button type="button" className="hx-btn" onClick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title="Fullscreen (f)">
              {fullscreen ? <CompressIcon /> : <ExpandIcon />}
            </button>
          </div>
        </div>
      )}

      {ccNote && <p className="hx-cc-note" role="status">{ccNote}</p>}
    </div>
  );
}