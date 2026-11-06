// Blog content for The Centre for Transformation.
// Bodies live in ../content/blog/<slug>.md and cover images in ../assets/blog/<slug>.<ext>,
// so adding a post means dropping two files here plus one entry below.
// Bodies load as their own chunk per post, so the homepage never ships article text.
const bodies = import.meta.glob('../content/blog/*.md', { query: '?raw', import: 'default' });
const covers = import.meta.glob('../assets/blog/*.{webp,png,jpg,jpeg}', { import: 'default', eager: true });

export const blogCategories = [
  { key: 'all', label: 'All Insights' },
  { key: 'consciousness', label: 'Consciousness' },
  { key: 'inner-peace', label: 'Inner Peace' },
  { key: 'mindfulness', label: 'Mindfulness' },
  { key: 'personal-growth', label: 'Personal Growth' },
  { key: 'relationships', label: 'Life & Relationships' },
];

export const blogSeries = [
  {
    key: 'coming-back-to-yourself',
    title: 'Coming Back to Yourself',
    sub: 'The series Zalah published across Medium and Substack: unhurried essays on slowing down, healing, letting go and finding your way back to yourself. Best read in order.',
    grad: 'linear-gradient(135deg,#241a45,#7a5cd6)',
  },
  {
    key: 'cft-blog',
    title: 'The CFT Blog',
    sub: 'Eight foundational reads written for thecft.ca: clarity, honesty, solitude, self trust and the quiet moments that change a life.',
    grad: 'linear-gradient(135deg,#3a2a63,#c9973e)',
  },
];

const cbty = 'coming-back-to-yourself';
const cft = 'cft-blog';

export const posts = [
  {
    slug: 'you-dont-have-to-have-everything-figured-out',
    series: cbty,
    part: 1,
    title: "You Don't Have to Have Everything Figured Out",
    dek: "Feeling lost isn't proof that you failed. Sometimes it's the beginning of coming back to yourself.",
    category: 'personal-growth',
    grad: 'linear-gradient(135deg,#3a2a63,#7a5cd6)',
  },
  {
    slug: 'you-are-allowed-to-slow-down',
    series: cbty,
    part: 2,
    title: 'You Are Allowed to Slow Down',
    dek: "When you don't know what to do next, the instinct is to do more. Here's what happens when you stop instead.",
    category: 'mindfulness',
    image: '/images/blog/candian-rockies.webp',
    grad: 'linear-gradient(135deg,#2f2258,#8a63e8)',
  },
  {
    slug: 'healing-doesnt-always-look-like-happiness',
    series: cbty,
    part: 4,
    title: "Healing Doesn't Always Look Like Happiness",
    dek: 'We tend to picture healing as waking up light and unbothered. Real healing is usually messier, and often more honest, than that.',
    category: 'inner-peace',
    grad: 'linear-gradient(135deg,#1a1033,#63409f)',
  },
  {
    slug: 'what-are-you-holding-onto-that-your-soul-is-asking-you-to-release',
    series: cbty,
    part: 5,
    title: 'What Are You Holding Onto That Your Soul Is Asking You to Release?',
    dek: "Some things we carry long after they've stopped serving us. Here's how to notice what you're ready to put down, and why that isn't the same as forgetting.",
    category: 'inner-peace',
    grad: 'linear-gradient(135deg,#241a45,#c9973e)',
  },
  {
    slug: 'you-are-more-than-what-happened-to-you',
    series: cbty,
    part: 6,
    title: 'You Are More Than What Happened to You',
    dek: "The hardest habit to break isn't a bad routine. It's mistaking your history for your identity.",
    category: 'consciousness',
    grad: 'linear-gradient(135deg,#5b3fa6,#2f2258)',
  },
  {
    slug: 'peace-doesnt-mean-your-life-is-perfect',
    series: cbty,
    part: 7,
    title: "Peace Doesn't Mean Your Life Is Perfect",
    dek: 'We tend to wait for peace until everything is finally sorted. What if it doesn\u2019t have to arrive last?',
    category: 'inner-peace',
    grad: 'linear-gradient(135deg,#7a5cd6,#3a2a63)',
  },
  {
    slug: 'when-you-feel-disconnected-from-yourself',
    series: cbty,
    part: 8,
    title: 'When You Feel Disconnected From Yourself',
    dek: "You can be surrounded by people, fully booked, and still feel strangely far from yourself. Here's what that usually means, and how to start closing the distance.",
    category: 'relationships',
    grad: 'linear-gradient(135deg,#2f2258,#c9973e)',
  },
  {
    slug: 'you-dont-need-to-become-someone-else-to-become-better',
    series: cbty,
    part: 9,
    title: "You Don't Need to Become Someone Else to Become Better",
    dek: 'Self-improvement quietly turns into self-rejection more often than we admit. Here\u2019s the difference between growing and disowning who you already are.',
    category: 'personal-growth',
    grad: 'linear-gradient(135deg,#63409f,#e8b95f)',
  },
  {
    slug: 'maybe-your-next-chapter-is-waiting-for-you',
    series: cbty,
    part: 10,
    title: 'Maybe Your Next Chapter Is Waiting for You',
    dek: "The finale of Coming Back to Yourself: on starting before you're ready, and the one thread that ran through all ten parts.",
    category: 'consciousness',
    grad: 'linear-gradient(135deg,#120a24,#8a63e8)',
  },
  {
    slug: 'you-dont-have-to-carry-everything-alone',
    series: cbty,
    part: 11,
    title: "You Don't Have to Carry Everything Alone",
    dek: "Independence and isolation get confused for each other more often than they should. Here's the difference, and why asking for help is not the opposite of being strong.",
    category: 'relationships',
    grad: 'linear-gradient(135deg,#3a2a63,#c9973e)',
  },
  {
    slug: 'when-you-feel-like-youre-falling-behind-in-life',
    series: cbty,
    part: 12,
    title: "When You Feel Like You're Falling Behind in Life",
    dek: "There's no universal schedule for a life well lived. Why comparison lies to you more than it informs you, and what to do instead.",
    category: 'personal-growth',
    grad: 'linear-gradient(135deg,#241a45,#7a5cd6)',
  },
  {
    slug: 'you-can-start-again-without-explaining-yourself-to-everyone',
    series: cbty,
    part: 13,
    title: 'You Can Start Again Without Explaining Yourself to Everyone',
    dek: "Change makes people ask questions. You don't owe all of them an answer. Why the right to begin again doesn't come with a mandatory press conference.",
    category: 'personal-growth',
    grad: 'linear-gradient(135deg,#5b3fa6,#1a1033)',
  },
  {
    slug: 'you-dont-have-to-earn-the-right-to-rest',
    series: cbty,
    part: 14,
    title: "You Don't Have to Earn the Right to Rest",
    dek: 'Rest got quietly redefined as something you have to deserve. It was never supposed to work that way. A case for stopping before you collapse, not after.',
    category: 'mindfulness',
    image: '/images/blog/rest.webp',
    grad: 'linear-gradient(135deg,#2f2258,#8a63e8)',
  },

  {
    slug: 'you-dont-have-to-have-everything-figured-out-cft',
    series: cft,
    part: 1,
    title: "You Don't Have to Have Everything Figured Out",
    date: '2026-08-31',
    excerpt: "Feeling lost or unsure what comes next? You don't have to have everything figured out. Learn how presence and one honest step create real clarity.",
    category: 'personal-growth',
    grad: 'linear-gradient(135deg,#3a2a63,#7a5cd6)',
  },
  {
    slug: 'the-quiet-weight-of-pretending-youre-fine',
    series: cft,
    part: 2,
    title: "The Quiet Weight of Pretending You're Fine",
    date: '2026-09-04',
    excerpt: 'Saying “I\'m fine” can become a habit. Learn what changes when you stop pretending, meet yourself honestly and practise real self compassion tonight.',
    category: 'inner-peace',
    sourceUrl: 'https://thecft.ca/the-quiet-weight-of-pretending-youre-fine/',
    grad: 'linear-gradient(135deg,#241a45,#7a5cd6)',
  },
  {
    slug: 'when-you-stop-running-from-yourself',
    series: cft,
    part: 3,
    title: 'When You Stop Running From Yourself',
    excerpt: 'Always reaching for a distraction the moment things get quiet? Learn why we run from ourselves and how to sit with what we find, gently.',
    category: 'consciousness',
    grad: 'linear-gradient(135deg,#2f2258,#5b3fa6)',
  },
  {
    slug: 'the-difference-between-being-alone-and-being-with-yourself',
    series: cft,
    part: 4,
    title: 'The Difference Between Being Alone and Being With Yourself',
    excerpt: 'You can be surrounded by people and still feel alone. Discover the real difference between loneliness and solitude, and how to enjoy your own company.',
    category: 'relationships',
    sourceUrl: 'https://thecft.ca/the-difference-between-being-alone-and-being-with-yourself/',
    grad: 'linear-gradient(135deg,#5b3fa6,#2f2258)',
  },
  {
    slug: 'the-moments-that-quietly-change-your-life',
    series: cft,
    part: 5,
    title: 'The Moments That Quietly Change Your Life',
    excerpt: 'Not every life-changing moment looks dramatic. Discover how small, quiet realizations shape real transformation, and a nightly practice to notice them.',
    category: 'consciousness',
    image: '/images/blog/moments.webp',
    sourceUrl: 'https://thecft.ca/the-moments-that-quietly-change-your-life/',
    grad: 'linear-gradient(135deg,#7a5cd6,#c9973e)',
  },
  {
    slug: 'what-if-you-dont-need-to-become-someone-else',
    series: cft,
    part: 6,
    title: "What If You Don't Need to Become Someone Else?",
    excerpt: "Feel like you must fix yourself before you're worthy? Discover why growth and self acceptance aren't opposites, and how to stop chasing who you 'should' be.",
    category: 'personal-growth',
    sourceUrl: 'https://thecft.ca/what-if-you-dont-need-to-become-someone-else/',
    grad: 'linear-gradient(135deg,#c9973e,#3a2a63)',
  },
  {
    slug: 'when-your-old-life-no-longer-feels-like-you',
    series: cft,
    part: 7,
    title: 'When Your Old Life No Longer Feels Like You',
    excerpt: 'Nothing looks wrong, but nothing feels the same. Discover why outgrowing your old life is a sign of growth, not something broken in you.',
    category: 'personal-growth',
    grad: 'linear-gradient(135deg,#1a1033,#8a63e8)',
  },
  {
    slug: 'learning-to-trust-yourself-again',
    series: cft,
    part: 8,
    title: 'Learning to Trust Yourself Again',
    excerpt: 'Stopped trusting your own decisions? Learn the real difference between intuition and fear, and small practices that rebuild self trust.',
    category: 'inner-peace',
    sourceUrl: 'https://thecft.ca/learning-to-trust-yourself-again/',
    grad: 'linear-gradient(135deg,#5b3fa6,#c9973e)',
  },

  // Published on thecft.ca; bodies still come over with the WordPress migration.
  {
    slug: 'from-stress-to-spiritual-growth-a-practical-roadmap',
    title: 'From Stress to Spiritual Growth: A Practical Roadmap',
    excerpt: 'From the CFT archives: a practical roadmap for turning everyday stress into spiritual growth.',
    category: 'personal-growth',
    image: '/images/photos/hedge-path.webp',
    sourceUrl: 'https://thecft.ca/from-stress-to-spiritual-growth-a-practical-roadmap/',
    grad: 'linear-gradient(135deg,#3a2a63,#7a5cd6)',
  },
  {
    slug: 'self-awareness-without-self-judgement',
    title: 'Self-Awareness Without Self-Judgement',
    excerpt: 'From the CFT archives: how to observe yourself honestly without turning awareness into self-criticism.',
    category: 'consciousness',
    image: '/images/blog/self-awareness.webp',
    sourceUrl: 'https://thecft.ca/self-awareness-without-self-judgement/',
    grad: 'linear-gradient(135deg,#2f2258,#5b3fa6)',
  },
  {
    slug: 'spiritual-burnout',
    title: 'Spiritual Burnout',
    excerpt: 'From the CFT archives: recognizing spiritual burnout and finding your way back to a sustainable practice.',
    category: 'personal-growth',
    image: '/images/photos/salt-flat.webp',
    sourceUrl: 'https://thecft.ca/spiritual-burnout/',
    grad: 'linear-gradient(135deg,#c9973e,#5b3fa6)',
  },
  {
    slug: 'the-art-of-letting-go',
    title: 'The Art of Letting Go',
    excerpt: 'From the CFT archives: the practice of releasing what you have been holding on to for too long.',
    category: 'inner-peace',
    image: '/images/photos/walking-path.webp',
    sourceUrl: 'https://thecft.ca/the-art-of-letting-go/',
    grad: 'linear-gradient(135deg,#1a1033,#7a5cd6)',
  },
  {
    slug: 'the-daily-spiritual-habits-that-actually-stick',
    title: 'The Daily Spiritual Habits That Actually Stick',
    excerpt: 'From the CFT archives: small daily spiritual habits designed to last beyond the first week of trying.',
    category: 'mindfulness',
    image: '/images/blog/daily-habits.webp',
    sourceUrl: 'https://thecft.ca/7-daily-spiritual-habits-that-actually-stick/',
    grad: 'linear-gradient(135deg,#3a2a63,#c9973e)',
  },
];

const bySlug = new Map(posts.map((p) => [p.slug, p]));

export const getPost = (slug) => bySlug.get(slug);

export const categoryLabel = (key) =>
  (blogCategories.find((c) => c.key === key) || {}).label || 'Insights';

// A shipped post names a registered series key; an article published from the
// admin carries its own series title, so an unknown key is already the label.
export const seriesLabel = (key) => (blogSeries.find((s) => s.key === key) || {}).title || key;

export const hasBody = (slug) => `../content/blog/${slug}.md` in bodies;

export const loadBody = (slug) =>
  bodies[`../content/blog/${slug}.md`] ? bodies[`../content/blog/${slug}.md`]() : Promise.resolve('');

export const readingMinutes = (markdown) =>
  Math.max(4, Math.round(markdown.split(/\s+/).filter(Boolean).length / 220));

// A cover uploaded to src/assets/blog/<slug>.<ext> is picked up automatically.
export const postCover = (slug) => {
  const found = Object.keys(covers).find((k) => k.includes(`/${slug}.`));
  return found ? covers[found] : null;
};

export const postMeta = (p) => {
  return {
    date: p.date ? new Date(p.date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
    cover: postCover(p.slug) || p.image || null,
    series: seriesLabel(p.series),
    blurb: p.dek || p.excerpt || null,
  };
};

// Real, same-topic articles for the "Related insights" rail on article pages.
// Hosted articles first so the rail never leads readers off-site unnecessarily.
export const relatedPosts = (p, n = 3) =>
  posts
    .filter((x) => x.slug !== p.slug && x.category === p.category)
    .sort((a, b) => (hasBody(b.slug) ? 1 : 0) - (hasBody(a.slug) ? 1 : 0))
    .slice(0, n);

// Full-text probe over the markdown bodies, used by the library search alongside
// the synchronous title/excerpt/category match. Resolves to matching slugs.
export const searchBodies = (q) =>
  Promise.all(
    Object.keys(bodies).map(async (key) => {
      const md = await bodies[key]();
      const slug = key.split('/').pop().replace(/\.md$/, '');
      return md.toLowerCase().includes(q) ? slug : null;
    }),
  ).then((hits) => hits.filter(Boolean));
