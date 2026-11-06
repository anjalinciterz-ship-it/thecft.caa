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
  const lifecycle = useRef(null);
  const frame = useRef(null);
  const iframe = useRef(null);

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
    };
    const pause = () => { playing = false; lastTick = performance.now(); void save(); };
    const resetSample = () => { lastTick = performance.now(); playing = false; };
    const onReady = async () => {
      if (!isCurrent()) return;
      ready = true;
      if (playback.resumePosition > 0) player.setCurrentTime(playback.resumePosition);
      await save();
      if (!isCurrent()) return;
      player.getPaused((paused) => { if (isCurrent()) { playing = !paused; lastTick = performance.now(); } });
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
    const readiness = window.setTimeout(() => { if (!ready) fail('The video player did not respond. Check your connection and try again.'); }, 15000);
    const expiry = window.setTimeout(() => fail('Playback authorization expired. Select Start video to authorize again.'), Math.max(0, new Date(playback.expiresAt).getTime() - Date.now()));
    const move = window.setInterval(() => setPosition((value) => (value + 1) % 4), playback.watermark.moveSeconds * 1000);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      closed = true;
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
      void save(true).finally(() => apiRequest(sessionPath, { method: 'DELETE' }).catch(() => {}));
    };
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
      setPlayback({ ...result, resumePosition: detail.progress?.lastPositionSeconds || 0 });
      adopted = true;
    } catch (err) { if (isCurrent()) setError(err.message); }
    finally {
      if (issued && !adopted) await apiRequest(`/video/playback/${encodeURIComponent(issued.sessionId)}`, { method: 'DELETE' }).catch(() => {});
      if (isCurrent()) setStarting(false);
    }
  };

  const selected = lessons.find((lesson) => lesson.id === lessonId);
  const marks = [{ top: '12%', left: '5%' }, { top: '12%', right: '5%' }, { bottom: '18%', right: '5%' }, { bottom: '18%', left: '5%' }];

  return (
    <section className="cq-band cq-plum cq-player" aria-label="Course lessons">
      <div className="container player-shell">
        <h2 className="cq-h2">Your course lessons</h2>
        {loading ? <p role="status">Loading your curriculum…</p> : (
          <>
            {lessons.length ? (
              <label style={{ display: 'block', marginBottom: 20 }}>
                Select lesson
                <select value={lessonId} disabled={starting} onChange={(event) => { setPlayback(null); setLessonId(event.target.value); setProgress(null); setError(''); setSaveError(''); }} style={{ display: 'block', width: '100%', maxWidth: 600, padding: 12, marginTop: 8 }}>
                  {!lessonId && <option value="">Choose a video lesson</option>}
                  {lessons.map((lesson) => <option key={lesson.id} value={lesson.id} disabled={!lesson.hasVideo || lesson.locked}>{lesson.title}{!lesson.hasVideo ? ', no video attached' : ''}</option>)}
                </select>
              </label>
            ) : <p>No lessons have been published yet.</p>}
            <div ref={frame} style={{ position: 'relative', aspectRatio: '16 / 9', width: '100%', background: '#120a24', border: '1px solid #e8b95f', borderRadius: 12, overflow: 'hidden' }}>
              {playback ? (
                <>
                  <iframe ref={iframe} title={selected?.title || 'Course video'} src={playback.playbackUrl} allow="autoplay; encrypted-media" referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
                  {playback.watermark.enabled && <span aria-hidden="true" style={{ position: 'absolute', ...marks[position], maxWidth: '85%', pointerEvents: 'none', zIndex: 2, color: '#fff', background: '#120a24', padding: '4px 8px', opacity: playback.watermark.opacity, fontSize: 'clamp(10px, 1.3vw, 16px)' }}>{playback.watermark.text}</span>}
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
            {playback && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setPlayback(null)}>Close video</button>
              <button type="button" className="btn btn-ghost" onClick={() => frame.current?.requestFullscreen?.().catch(() => setError('Fullscreen is unavailable in this browser.'))}>Fullscreen</button>
            </div>}
            <p style={{ opacity: 0.75, fontSize: 13, marginTop: 16 }}>Access is checked by the server. {playback?.drm.active ? 'DRM is active for this session.' : 'Enterprise DRM has not been verified.'}</p>
          </>
        )}
      </div>
    </section>
  );
}
