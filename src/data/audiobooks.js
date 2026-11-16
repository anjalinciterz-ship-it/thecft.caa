/* Every audiobook recording the site plays, in one place.

   Bunny Stream is the source of these files. Each row is one uploaded recording
   and `guid` is the id Stream gave it once the mp3 finished processing, so a
   row with no guid is a row that cannot be played from Bunny yet. Nothing here
   is guessed: `bunnyAudioUrl` returns null rather than inventing an address.

   The playback shape is the one already proven against this account by the two
   kids-meditation films in books.js and the course intro films in courses.js:
   https://{library host}/{guid}/playlist.m3u8, with {guid}/thumbnail.jpg beside
   it. Both are reachable without a signature on that library, so an anonymous
   visitor on /books gets audio the same way they get those films.
*/

/* The Stream library the audiobooks were uploaded to, and its CDN hostname from
   that library's Settings page. Filled from the account, never assumed. */
export const BUNNY_AUDIO_LIBRARY = {
  id: null,
  host: null,
};

/* `key` is the recording's own name as the client stored it, which is also what
   src/data/books.js already uses as the track id. `label` is what he called it
   in the book document; the card titles themselves stay positional. */
export const audiobooks = [
  { key: 'Book 1- Secret of creation/Audio Track 1.mp3', label: 'Book 1 · Track 1', guid: null },
  { key: 'Book 1- Secret of creation/Audio Track 2.mp3', label: 'Book 1 · Track 2', guid: null },
  { key: 'Book 1- Secret of creation/Audio Track 3.mp3', label: 'Book 1 · Track 3', guid: null },
  { key: 'Book 1- Secret of creation/Audio Track 4.mp3', label: 'Book 1 · Track 4', guid: null },
  { key: 'Book 1- Secret of creation/Audio Track 5.mp3', label: 'Book 1 · Track 5', guid: null },
  { key: 'Book 1- Secret of creation/Audio Track 6.mp3', label: 'Book 1 · Track 6', guid: null },
  { key: 'Book 1- Secret of creation/Audio Track 7.mp3', label: 'Book 2 · Track 1', guid: null },
  { key: 'Book 1- Secret of creation/Audio Track 8.mp3', label: 'Book 2 · Track 2', guid: null },
  { key: 'Book 2 – CAUGHT in the ACT/1-Audio-Track.mp3', label: 'Track 1', guid: null },
  { key: 'Book 2 – CAUGHT in the ACT/2-Audio-Track.mp3', label: 'Track 2', guid: null },
  { key: 'Book 2 – CAUGHT in the ACT/3-Audio-Track.mp3', label: 'Track 3', guid: null },
  { key: 'Book 2 – CAUGHT in the ACT/4-Audio-Track.mp3', label: 'Track 4', guid: null },
  { key: 'Book 2 – CAUGHT in the ACT/5-Audio-Track.mp3', label: 'Track 5', guid: null },
  { key: 'Book 2 – CAUGHT in the ACT/6-Audio-Track.mp3', label: 'Track 6', guid: null },
  { key: 'Book 2 – CAUGHT in the ACT/7-Audio-Track.mp3', label: 'Track 7', guid: null },
  { key: 'Book 2 – CAUGHT in the ACT/8-Audio-Track.mp3', label: 'Track 8', guid: null },
  { key: 'Book 2 – CAUGHT in the ACT/9-Audio-Track.mp3', label: 'Track 9', guid: null },
  { key: 'Book 2 – CAUGHT in the ACT/part2CINTHEA.mp3', label: 'Track 10', guid: null },
];

const byKey = new Map(audiobooks.map((a) => [a.key, a]));

/** The Bunny Stream playback url for a recording, or null when Stream's id for
 *  it is not recorded yet. */
export const bunnyAudioUrl = (key) => {
  const row = byKey.get(key);
  if (!row?.guid || !BUNNY_AUDIO_LIBRARY.host) return null;
  return `${BUNNY_AUDIO_LIBRARY.host.replace(/\/+$/, '')}/${row.guid}/playlist.m3u8`;
};
