import { useEffect, useRef, useState } from 'react';
import { apiRequest } from '../lib/api';

let playerApiRequest;

function loadPlayerApi() {
  if (window.playerjs?.Player) return Promise.resolve();
  if (!playerApiRequest) {
    playerApiRequest = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const finish = (error) => {
        window.clearTimeout(timeout);
        script.onload = null;
        script.onerror = null;
        if (error) { script.remove(); reject(error); }
        else resolve();
      };
      const timeout = window.setTimeout(() => finish(new Error('The video controls did not load. Please try again.')), 15000);
      script.src = 'https://assets.mediadelivery.net/playerjs/playerjs-latest.min.js';
      script.async = true;
      script.onload = () => finish(window.playerjs?.Player ? null : new Error('The video controls are unavailable.'));
      script.onerror = () => finish(new Error('The video controls could not load. Please try again.'));
      document.head.appendChild(script);
    }).catch((error) => { playerApiRequest = null; throw error; });
  }
  return playerApiRequest;
}

export default function CoursePlayer({ courseId, initialLessonId }) {
  const [lessons, setLessons] = useState([]);
  const [lessonId, setLessonId] = useState('');
  const [playback, setPlayback] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [position, setPosition] = useState(0);
  const [ccEnabled, setCcEnabled] = useState(false);
  const [cues, setCues] = useState([]);
  const [activeCue, setActiveCue] = useState('');
  const [ccNote, setCcNote] = useState('');
  const [autoplayMuted, setAutoplayMuted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lifecycle = useRef(null);
  const frame = useRef(null);
  const iframe = useRef(null);
  const playerRef = useRef(null);
  const cuesRef = useRef([]);
  const ccEnabledRef = useRef(false);
  const autoStartFor = useRef('');

  useEffect(() => { cuesRef.current = cues; }, [cues]);
  useEffect(() => { ccEnabledRef.current = ccEnabled; if (!ccEnabled) setActiveCue(''); }, [ccEnabled]);
  useEffect(() => {
    if (!ccNote) return undefined;
    const timer = window.setTimeout(() => setCcNote(''), 4000);
    return () => window.clearTimeout(timer);
  }, [ccNote]);

  useEffect(() => {
    const current = { active: true };
    lifecycle.current = current;
    const controller = new AbortController();
    setLoading(true);
    setLessons([]);
    setLessonId('');
    setPlayback(null);
    setProgress(null);
    setStarting(false);
    setError('');
    setSaveError('');
    setAutoplayMuted(false);
    setDismissed(false);
    autoStartFor.current = '';
    apiRequest(`/student/courses/${encodeURIComponent(courseId)}`, { signal: controller.signal })
      .then((data) => {
        if (!current.active) return;
        const rows = data.curriculum.flatMap((module) => module.lessons);
        const playable = rows.filter((lesson) => lesson.hasVideo && !lesson.locked);
        setLessons(rows);
        setLessonId(initialLessonId
          ? playable.find((lesson) => String(lesson.id) === String(initialLessonId))?.id || ''
          : playable[0]?.id || '');
      })
      .catch((err) => { if (current.active) setError(err.message); })
      .finally(() => { if (current.active) setLoading(false); });
    return () => { current.active = false; controller.abort(); };
  }, [courseId, initialLessonId]);

  useEffect(() => {
    if (!playback) return undefined;
    const current = lifecycle.current;
    let closed = false;
    let pendingHeartbeat = false;
    let saving = null;
    let ready = false;
    let playing = false;
    let pendingSeconds = 0;
    let lastSeconds = playback.resumePosition || 0;
    let lastTick = performance.now();
    let player;
    const sessionPath = `/video/playback/${encodeURIComponent(playback.sessionId)}`;
    const isCurrent = () => !closed && current.active && lifecycle.current === current;
    const fail = (message) => {
      if (!isCurrent()) return;
      setError(message);
      setPlayback(null);
    };
    const save = async (final = false) => {
      if ((!ready && !final) || (closed && !final)) return;
      if (saving) { await saving; if (!final) return; }
      const delta = pendingSeconds;
      pendingSeconds = 0;
      saving = apiRequest(`/student/lessons/${playback.lesson.id}/progress`, {
        method: 'POST',
        body: { sessionId: playback.sessionId, positionSeconds: lastSeconds, watchedDeltaSeconds: delta },
      }).then((result) => {
        if (isCurrent()) { setProgress(result); setSaveError(''); }
      }).catch((err) => {
        if (isCurrent()) {
          if ([401, 403, 410].includes(err.status)) fail(err.message);
          else setSaveError('Progress could not be saved. Keep this page open and check your connection.');
        }
      }).finally(() => { saving = null; });
      await saving;
    };
    const sample = (data) => {
      const seconds = Number(data?.seconds);
      if (!Number.isFinite(seconds) || seconds < 0) return;
      const now = performance.now();
      const elapsed = Math.max(0, (now - lastTick) / 1000);
      const advance = seconds - lastSeconds;
      if (ready && playing && !document.hidden && elapsed <= 5 && advance > 0 && advance <= elapsed * 2 + 1) {
        pendingSeconds += Math.min(elapsed, advance);
      }
      lastSeconds = seconds;
      lastTick = now;
      const cue = ccEnabledRef.current ? cuesRef.current.find((c) => seconds >= c.start && seconds < c.end) : null;
      const text = cue ? cue.text : '';
      setActiveCue((prev) => (prev === text ? prev : text));
    };
    const pause = () => { playing = false; lastTick = performance.now(); void save(); };
    const resetSample = () => { lastTick = performance.now(); playing = false; };
    let mutedRetry;
    const beginPlayback = () => {
      player.play();
      // Browsers only allow audible autoplay once the domain has media
      // engagement, and Safari never allows it unmuted. When the first attempt
      // is blocked, replay muted and hand the viewer an Unmute button.
      mutedRetry = window.setTimeout(() => {
        if (!isCurrent()) return;
        player.getPaused((paused) => {
          if (!isCurrent() || !paused) return;
          player.mute?.();
          player.play();
          setAutoplayMuted(true);
        });
      }, 1500);
    };
    const onReady = async () => {
      if (!isCurrent()) return;
      ready = true;
      if (playback.resumePosition > 0) player.setCurrentTime(playback.resumePosition);
      await save();
      if (!isCurrent()) return;
      player.getPaused((paused) => { if (isCurrent()) { playing = !paused; lastTick = performance.now(); } });
      beginPlayback();
    };
    const seeked = () => {
      resetSample();
      player.getCurrentTime((seconds) => {
        if (!isCurrent()) return;
        if (Number.isFinite(seconds)) lastSeconds = seconds;
        player.getPaused((paused) => { if (isCurrent()) { playing = !paused; lastTick = performance.now(); } });
      });
    };
    const visibility = () => {
      resetSample();
      if (document.hidden) void save();
      else if (ready) player.getPaused((paused) => { if (isCurrent()) { playing = !paused; lastTick = performance.now(); } });
    };
    const events = {
      ready: onReady,
      play: () => { playing = true; lastTick = performance.now(); },
      pause,
      ended: pause,
      timeupdate: sample,
      seeked,
      error: () => fail('The video provider could not play this lesson. Please try again.'),
    };
    try {
      player = new window.playerjs.Player(iframe.current);
      playerRef.current = player;
      for (const [event, handler] of Object.entries(events)) player.on(event, handler);
    } catch { fail('The video controls are unavailable. Please try again.'); }
    const heartbeat = window.setInterval(async () => {
      if (pendingHeartbeat || !isCurrent()) return;
      pendingHeartbeat = true;
      try { await apiRequest(`${sessionPath}/heartbeat`, { method: 'POST' }); }
      catch (err) { fail(err.message); }
      finally { pendingHeartbeat = false; }
    }, 20000);
    const saveInterval = window.setInterval(() => { void save(); }, 10000);
    const readiness = window.setTimeout(() => { if (!ready) fail('The video player did not respond. Check your connection and try again.'); }, 30000);
    const expiry = window.setTimeout(() => fail('Playback authorization expired. Select Start video to authorize again.'), Math.max(0, new Date(playback.expiresAt).getTime() - Date.now()));
    const move = window.setInterval(() => setPosition((value) => (value + 1) % 4), playback.watermark.moveSeconds * 1000);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      closed = true;
      window.clearTimeout(mutedRetry);
      window.clearInterval(heartbeat);
      window.clearInterval(saveInterval);
      window.clearInterval(move);
      window.clearTimeout(readiness);
      window.clearTimeout(expiry);
      document.removeEventListener('visibilitychange', visibility);
      if (player) for (const event of Object.keys(events)) {
        // Player.js unsubscribes locally before messaging an iframe React may have detached.
        try { player.off(event); } catch {}
      }
      playerRef.current = null;
      void save(true).finally(() => apiRequest(sessionPath, { method: 'DELETE' }).catch(() => {}));
    };
  }, [playback]);

  useEffect(() => {
    setCues([]);
    setActiveCue('');
    setCcEnabled(false);
    setCcNote('');
    if (!playback) return undefined;
    const current = { active: true };
    apiRequest(`/video/lessons/${encodeURIComponent(playback.lesson.id)}/captions`)
      .then((data) => { if (current.active) setCues(Array.isArray(data.cues) ? data.cues : []); })
      .catch(() => { /* No caption file for this video yet; CC reports availability. */ });
    return () => { current.active = false; };
  }, [playback]);

  const start = async () => {
    if (!lessonId || starting) return;
    const current = lifecycle.current;
    const isCurrent = () => current.active && lifecycle.current === current;
    let issued;
    let adopted = false;
    setStarting(true);
    setError('');
    setSaveError('');
    try {
      const [detail] = await Promise.all([apiRequest(`/student/lessons/${lessonId}`), loadPlayerApi()]);
      if (!isCurrent()) return;
      const { playback: result } = await apiRequest(`/video/lessons/${lessonId}/playback`, { method: 'POST' });
      issued = result;
      if (!isCurrent()) return;
      let supported = false;
      try {
        const url = new URL(result.playbackUrl);
        supported = result.playbackType === 'iframe' && url.origin === 'https://player.mediadelivery.net'
          && /^\/embed\/\d+\/[a-f\d-]{36}\/?$/i.test(url.pathname) && Number.isFinite(new Date(result.expiresAt).getTime());
      } catch { supported = false; }
      if (!supported) throw new Error('The video provider returned an unsupported player.');
      setProgress(detail.progress);
      setPosition(0);
      setAutoplayMuted(false);
      setPlayback({ ...result, resumePosition: detail.progress?.lastPositionSeconds || 0 });
      adopted = true;
    } catch (err) { if (isCurrent()) setError(err.message); }
    finally {
      if (issued && !adopted) await apiRequest(`/video/playback/${encodeURIComponent(issued.sessionId)}`, { method: 'DELETE' }).catch(() => {});
      if (isCurrent()) setStarting(false);
    }
  };

  // Bunny's embed page only wires up its player API inside a requestAnimationFrame
  // callback, and Chrome stops driving rAF for a cross-origin iframe that is not
  // on screen, so an autoplay that starts below the fold never begins. The auto
  // path therefore brings the frame into view first; a clicked Start video is
  // already being looked at.
  const revealPlayer = () => {
    const el = frame.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    const onScreen = box.height > 0 && box.top < window.innerHeight * 0.8 && box.bottom > window.innerHeight * 0.2;
    if (!onScreen) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // The curriculum effect selects the first playable lesson, which in every
  // course is the intro, so a course opened from My Learning authorizes and
  // starts it without a click. "Close video" opts out until another lesson is
  // chosen; autoStartFor keeps a failed authorization from looping.
  useEffect(() => {
    if (dismissed || playback || starting || error || !lessonId) return;
    if (autoStartFor.current === lessonId) return;
    autoStartFor.current = lessonId;
    revealPlayer();
    void start();
  }, [lessonId, playback, starting, error, dismissed]);

  const selected = lessons.find((lesson) => lesson.id === lessonId);
  // A bundle lists the teachings of every course inside it, and lesson titles repeat
  // across those courses, so the picker names the course each video belongs to.
  const lessonGroups = [];
  for (const lesson of lessons) {
    const key = lesson.courseTitle || '';
    const last = lessonGroups[lessonGroups.length - 1];
    if (last && last.key === key) last.items.push(lesson);
    else lessonGroups.push({ key, items: [lesson] });
  }
  const lessonOptions = (items) => items.map((lesson) => <option key={lesson.id} value={lesson.id} disabled={!lesson.hasVideo || lesson.locked}>{lesson.title}{!lesson.hasVideo ? ', no video attached' : ''}</option>);
  const marks = [{ top: '12%', left: '5%' }, { top: '12%', right: '5%' }, { bottom: '18%', right: '5%' }, { bottom: '18%', left: '5%' }];
  const controlButtonStyle = { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '10px 18px', borderRadius: 24, cursor: 'pointer', fontSize: 14, fontWeight: 500, backdropFilter: 'blur(8px)', pointerEvents: 'auto' };

  const skipBackward = () => {
    const player = playerRef.current;
    if (!player) return;
    player.getCurrentTime((seconds) => {
      if (Number.isFinite(seconds)) player.setCurrentTime(Math.max(0, seconds - 10));
    });
  };

  const skipForward = () => {
    const player = playerRef.current;
    if (!player) return;
    player.getCurrentTime((seconds) => {
      if (Number.isFinite(seconds)) player.setCurrentTime(seconds + 10);
    });
  };

  const toggleCC = () => {
    if (!playback) return;
    if (!cues.length) {
      setCcNote('English captions are not available for this lesson yet.');
      return;
    }
    setCcNote('');
    setCcEnabled((value) => !value);
  };

  const unmute = () => {
    const player = playerRef.current;
    if (!player) return;
    player.unmute?.();
    player.play();
    setAutoplayMuted(false);
  };

  const toggleFullscreen = () => {
    const el = frame.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.().catch(() => setError('Fullscreen is unavailable in this browser.'));
    }
  };

  return (
    <section className="cq-band cq-plum cq-player" aria-label="Course lessons">
      <div className="container player-shell">
        <h2 className="cq-h2">Your course lessons</h2>
        {loading ? <p role="status">Loading your curriculum…</p> : (
          <>
            {lessons.length ? (
              <label style={{ display: 'block', marginBottom: 20 }}>
                Select lesson
                <select value={lessonId} disabled={starting} onChange={(event) => { setPlayback(null); setLessonId(event.target.value); setProgress(null); setError(''); setSaveError(''); setDismissed(false); autoStartFor.current = ''; }} style={{ display: 'block', width: '100%', maxWidth: 600, padding: 12, marginTop: 8 }}>
                  {!lessonId && <option value="">Choose a video lesson</option>}
                  {lessonGroups.flatMap((group) => (group.key
                    ? [<optgroup key={`group-${group.items[0].id}`} label={group.key}>{lessonOptions(group.items)}</optgroup>]
                    : lessonOptions(group.items)))}
                </select>
              </label>
            ) : <p>No lessons have been published yet.</p>}
            <div ref={frame} style={{ position: 'relative', aspectRatio: '16 / 9', width: '100%', background: '#120a24', border: '1px solid #e8b95f', borderRadius: 12, overflow: 'hidden' }}>
              {playback ? (
                <>
                  <iframe ref={iframe} title={selected?.title || 'Course video'} src={playback.playbackUrl} allow="autoplay; encrypted-media; fullscreen" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
                  {playback.watermark.enabled && <span aria-hidden="true" style={{ position: 'absolute', ...marks[position], maxWidth: '85%', pointerEvents: 'none', zIndex: 2, color: '#fff', background: '#120a24', padding: '4px 8px', opacity: playback.watermark.opacity, fontSize: 'clamp(10px, 1.3vw, 16px)' }}>{playback.watermark.text}</span>}
                  {ccEnabled && activeCue && <div style={{ position: 'absolute', bottom: 64, left: 0, right: 0, zIndex: 2, display: 'flex', justifyContent: 'center', padding: '0 16px', pointerEvents: 'none' }}><span style={{ background: 'rgba(18,10,36,0.85)', color: '#fff', padding: '6px 14px', borderRadius: 8, fontSize: 'clamp(14px, 2vw, 20px)', lineHeight: 1.4, textAlign: 'center', maxWidth: '92%', whiteSpace: 'pre-wrap' }}>{activeCue}</span></div>}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, padding: '12px 16px', background: 'linear-gradient(to bottom, rgba(18,10,36,0.9) 0%, rgba(18,10,36,0.55) 60%, transparent 100%)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', pointerEvents: 'none' }}>
                    <button type="button" onClick={() => { setDismissed(true); autoStartFor.current = ''; setPlayback(null); }} style={controlButtonStyle}>Close video</button>
                    {autoplayMuted && <button type="button" onClick={unmute} title="Turn the sound on" style={{ ...controlButtonStyle, background: 'linear-gradient(98deg,#fbe7bc 0%,#e8b95f 42%,#ce9c42 100%)', border: '1px solid #e8b95f', color: '#120a24', fontWeight: 700 }}>🔊 Unmute</button>}
                    <button type="button" onClick={skipBackward} title="Skip back 10 seconds" style={controlButtonStyle}>⏪ 10s</button>
                    <button type="button" onClick={skipForward} title="Skip forward 10 seconds" style={controlButtonStyle}>10s ⏩</button>
                    <button type="button" onClick={toggleCC} title="Toggle English captions" aria-pressed={ccEnabled} style={controlButtonStyle}>CC {ccEnabled ? 'ON' : 'OFF'}</button>
                    <button type="button" onClick={toggleFullscreen} title="Toggle fullscreen" style={controlButtonStyle}>⛶ Fullscreen</button>
                  </div>
                </>
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center', padding: 24 }}>
                  <p>{selected?.title || 'Select a video lesson to begin'}</p>
                  <button className="btn btn-gold" type="button" disabled={!lessonId || starting} onClick={start}>{starting ? 'Authorizing…' : 'Start video'}</button>
                </div>
              )}
            </div>
            {progress && <p role="status" style={{ marginTop: 16 }}>{progress.status === 'completed' ? 'Lesson complete' : `${progress.watchedPercent || 0}% watched, saved to your account`}</p>}
            {error && <p role="alert" style={{ color: '#e8b95f', marginTop: 16 }}>{error}</p>}
            {saveError && <p role="alert" style={{ color: '#e8b95f', marginTop: 16 }}>{saveError}</p>}
            {ccNote && <p role="status" style={{ color: '#e8b95f', marginTop: 16 }}>{ccNote}</p>}
            <p style={{ opacity: 0.75, fontSize: 13, marginTop: 16 }}>Access is checked by the server. {playback?.drm.active ? 'DRM is active for this session.' : 'Enterprise DRM has not been verified.'}</p>
          </>
        )}
      </div>
    </section>
  );
}
