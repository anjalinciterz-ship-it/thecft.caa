export const courseCategories = [
  { key: 'all', label: 'All Courses' },
  { key: 'consciousness', label: 'Consciousness' },
  { key: 'spiritual-growth', label: 'Spiritual Growth' },
  { key: 'mindfulness', label: 'Mindfulness' },
  { key: 'life-transformation', label: 'Life Transformation' },
];

// Prices verified against the live Mighty Networks checkout on 2026-10-13.
// The WooCommerce product prices on thecft.ca are stale (e.g. Accelerator $33).
export const courses = [
  {
    id: 'accelerator',
    num: '01',
    slug: '10-part-consciousness-accelerator',
    name: '10-Part Consciousness Accelerator',
    short: 'A step-by-step journey to expand your awareness and create a more fulfilling life.',
    badge: 'Bestseller',
    price: 199,
    level: 'Beginner Friendly',
    length: '10 Modules',
    lives: '5,000+',
    categories: ['consciousness', 'life-transformation'],
    image: '/images/courses/accelerator.png',
    banner: '/images/courses/accelerator-banner.webp',
    grad: 'linear-gradient(135deg,#3a2a63,#7a5cd6)',
    description:
      'Join this accelerator course to form a deeper and more meaningful understanding of our world and increase your consciousness by opening the doors to your heart to the love that is waiting for you.',
    outcome:
      'Elevate your consciousness and transform your life in just 10 days, with 12-minute daily sessions built on the 32 Points of Sacred Interest.',
    bannerW: 1669,
    bannerH: 942,
    outcomes: [
      'Greater self-awareness',
      'Practical tools and guidance',
      'Inner peace and emotional balance',
      'A more fulfilling and purposeful life',
    ],
    whoFor: [
      'New to consciousness work and want a structured, step-by-step starting point.',
      'Looking for a short daily practice rather than long classes.',
      'Want a guided exercise to integrate every lesson.',
    ],
    faqs: [
      {
        q: 'How is the Accelerator structured?',
        a: 'Ten lessons, each with its own video and guided exercise, plus two recorded Q&A sessions with Zalah. The program is designed around short daily sessions of about 12 minutes across 10 days.',
      },
      {
        q: 'How do I enrol and pay?',
        a: 'The Enroll Now button enrols you right here on this site, and the program opens in My Courses. The price is $199 USD.',
      },
      {
        q: 'Do I need any experience first?',
        a: 'No. The Accelerator is labelled beginner friendly and starts from the foundations of awareness and presence.',
      },
    ],
    seo: {
      title: '10-Part Consciousness Accelerator — CFT by Zalah',
      desc: 'A step-by-step journey to expand your awareness and create a more fulfilling life. Ten lessons with guided exercises. $199 USD.',
    },
    curriculum: [
      { title: 'Lesson 1 – Introduction', items: ['How to Optimize Your Course Experience', 'Welcome', 'Lesson 1 Video', 'Exercise #1'] },
      { title: 'Lesson 2 – The Whys, “Wise”', items: ['Lesson 2 Video', 'Exercise #2'] },
      { title: 'Lesson 3 – The Quickening', items: ['Lesson 3 Video', 'Exercise #3'] },
      { title: 'Lesson 4 – Integrity and Love', items: ['Lesson 4 Video', 'Exercise #4'] },
      { title: 'Lesson 5 – Love and Freedom', items: ['Lesson 5 Video', 'Exercise #5'] },
      { title: 'Question & Answer With Zalah — Part 1', items: ['Recording of Q&A with Zalah, Part 1'] },
      { title: 'Question & Answer With Zalah — Part 2', items: ['Recording of Q&A with Zalah, Part 2'] },
      { title: 'Lesson 6 – Presence & The Spiral of Life', items: ['Lesson 6 Video', 'Exercise #6'] },
      { title: 'Lesson 7 – Love & Your Three Part System', items: ['Lesson 7 Video', 'Exercise #7'] },
      { title: 'Lesson 8 – Beingness', items: ['Lesson 8 Video Class', 'Exercise #8'] },
      { title: 'Lesson 9', items: ['Lesson 9 Video', 'Exercise #9'] },
      { title: 'Lesson 10', items: ['Lesson 10 Video', 'Exercise #10'] },
    ],
  },
  {
    id: 'mindlife',
    num: '02',
    slug: 'the-mind-life-transformation-collection',
    name: 'The Mind & Life Transformation Collection',
    short: 'Practical tools and timeless wisdom for a calmer, clearer and more meaningful life.',
    badge: 'Bundle',
    price: 229,
    level: 'All Levels',
    length: 'Collection',
    tag: 'Self-Growth',
    lives: '3,900+',
    categories: ['mindfulness', 'life-transformation'],
    image: '/images/courses/mind-life-collection.webp',
    banner: '/images/courses/mindlife-banner.webp',
    grad: 'linear-gradient(135deg,#c9973e,#5b3fa6)',
    description:
      'Explore a unique combination of emotional insight, life philosophy and meditation psychology. This collection is designed to help you better understand yourself, your thoughts, and your connection with the world around you.',
    outcome: 'Gain clarity, improve focus, and develop a more balanced and peaceful mindset.',
    bundleIncludes: ['swimming-pool', 'valentines', 'accelerator', 'earth-day', 'psychology-of-meditation'],
    bannerW: 1670,
    bannerH: 942,
    outcomes: [
      'Clearer thinking and improved focus',
      'A more balanced and peaceful mindset',
      'A deeper understanding of yourself and your thoughts',
      'A stronger sense of connection with the world around you',
    ],
    whoFor: [
      'Want a library of practical teachings you can return to.',
      'Interested in emotional insight, life philosophy and meditation psychology.',
      'Want several teachings bundled together, including the Consciousness Accelerator.',
    ],
    faqs: [
      {
        q: 'What is inside the collection?',
        a: 'Five teachings: Life is Like a Swimming Pool, Gain from Valentine’s Day, Earth Day, Psychology of Meditation, and the 10-Part Consciousness Accelerator.',
      },
      {
        q: 'How do I enrol and pay?',
        a: 'The Enroll Now button enrols you right here on this site, and the collection opens in My Courses. The price is $229 USD.',
      },
      {
        q: 'Is it a single course or a library?',
        a: 'It is a collection: each teaching stands on its own rather than forming one locked-step curriculum.',
      },
    ],
    seo: {
      title: 'The Mind & Life Transformation Collection — CFT by Zalah',
      desc: 'Five practical teachings for a calmer, clearer and more meaningful life, including the 10-Part Consciousness Accelerator. $229 USD.',
    },
  },
  {
    id: 'sa1',
    num: '03',
    slug: 'spiritual-awakening-1',
    name: 'Spiritual Awakening 1',
    short: 'Start your journey towards a deeper connection with yourself and the universe.',
    badge: 'Most Popular',
    price: 1000,
    level: 'Level 1',
    length: 'Self-Paced',
    tag: 'Foundational',
    lives: '4,500+',
    categories: ['spiritual-growth'],
    image: '/images/courses/spiritual-awakening-series.png',
    banner: '/images/courses/sa1-banner.webp',
    grad: 'linear-gradient(135deg,#5b3fa6,#c9973e)',
    description:
      'The first stage of the Spiritual Awakening pathway. These teachings are designed to help you build a stable meditation practice, understand the mechanics of consciousness, and begin living from a place of greater awareness.',
    curriculum: [
      { title: 'Welcome & Orientation', items: ['SA1 Welcome V1', 'SA1 Welcome V2', 'SA1 Site Tutorial', 'SA1 Intro Final', 'SA1 Outro Final'] },
      { title: 'Meditation Practice', items: ['SA1 Meditation 11', 'SA1 Meditation Set-up'] },
      { title: 'Live Classes', items: ['SA1 Class 1 Final', 'SA1 Class 2 Final', 'SA1 Class 3 Final', 'SA1 Class 4 Final', 'SA1 Class 5 Final', 'SA1 Class 6 Final', 'SA1 Class 7 Final', 'SA1 Class 7 Candle Exercise Final', 'SA1 Class 8 Final'] },
    ],
    bannerW: 1670,
    bannerH: 941,
    outcomes: [
      'Awaken your higher self',
      'Deepen inner peace',
      'Release what holds you back',
      'Create a more meaningful life',
    ],
    whoFor: [
      'Ready to build a stable meditation practice.',
      'Want to understand the mechanics of consciousness, not just the idea of it.',
      'Like live-class teaching alongside self-paced material.',
    ],
    faqs: [
      {
        q: 'What does SA1 include?',
        a: 'Welcome and orientation videos, meditation set-up guidance, and the recorded SA1 live classes.',
      },
      {
        q: 'How do I enrol and pay?',
        a: 'The Enroll Now button enrols you right here on this site, and the program opens in My Courses. The price is $1,000 USD.',
      },
      {
        q: 'Is SA1 self-paced?',
        a: 'Yes. SA1 is listed as self-paced and is Level 1 of the Spiritual Awakening pathway.',
      },
    ],
    seo: {
      title: 'Spiritual Awakening 1 — CFT by Zalah',
      desc: 'Start your journey to a deeper connection, inner peace and a more fulfilling life. Level 1, self-paced. $1,000 USD.',
    },
  },
  {
    id: 'sa2',
    num: '04',
    slug: 'spiritual-awakening-2',
    name: 'Spiritual Awakening 2',
    short: 'Go deeper into your transformation with advanced teachings and practices.',
    badge: 'Advanced',
    price: 2000,
    level: 'Level 2',
    length: 'Self-Paced',
    tag: 'Advanced',
    lives: '3,200+',
    categories: ['spiritual-growth'],
    image: '/images/courses/spiritual-awakening-series.png',
    banner: '/images/courses/sa2-banner.webp',
    grad: 'linear-gradient(135deg,#2f2258,#5b3fa6)',
    description:
      'The second stage of the pathway. SA2 deepens the work begun in SA1: detachment, stillness, worthiness, self-love and sacredness, taught in the live School class format.',
    curriculum: [
      { title: 'Introduction', items: ['SA2 Introduction', 'SA2 Oath — Initiation School class 1'] },
      { title: 'Core Teachings', items: ['SA2 Addition to Meditation Setup', 'SA2 Integrity Finalized', 'SA2 Detachment Tips Final', 'SA2 Magical Process Final', 'SA2 Attraction Final', 'SA2 Detachment Final', 'SA2 Sacredness Final', 'SA2 Stillness Final', 'SA2 Story Final'] },
      { title: 'Deepening Practice', items: ['10. SA2 Worthiness Final', '11. SA2 Self Love Final', '12. SA2 Meditation Set-up Final'] },
    ],
    bannerW: 1670,
    bannerH: 942,
    outcomes: [
      'Deepen your awareness',
      'Strengthen inner peace',
      'Heal and release what holds you back',
      'Live a more purposeful life',
    ],
    whoFor: [
      'Continuing and deepening the work begun in SA1.',
      'Ready for advanced themes: detachment, stillness, worthiness, self-love and sacredness.',
      'Comfortable with the live School class format.',
    ],
    faqs: [
      {
        q: 'What does SA2 cover?',
        a: 'SA2 deepens the work begun in SA1: detachment, stillness, worthiness, self-love and sacredness, taught in the live School class format.',
      },
      {
        q: 'How do I enrol and pay?',
        a: 'The Enroll Now button enrols you right here on this site, and the program opens in My Courses. The price is $2,000 USD.',
      },
      {
        q: 'Do I need SA1 before SA2?',
        a: 'SA2 is Level 2 of the pathway and deepens work begun in SA1, but nothing here is gated. If you are unsure which stage fits you, use the guidance section or book a call with Zalah.',
      },
    ],
    seo: {
      title: 'Spiritual Awakening 2 — CFT by Zalah',
      desc: 'Go deeper into your inner transformation with advanced teachings on detachment, stillness, worthiness and self-love. $2,000 USD.',
    },
  },
  {
    id: 'complete',
    num: '05',
    slug: 'the-complete-awakening-consciousness-transformation-program',
    name: 'The Complete Awakening & Consciousness Transformation Program',
    short: 'A complete path to transform your life and awaken your higher self.',
    badge: 'Complete Path',
    price: 2199,
    level: 'Advanced',
    length: 'Full Program',
    tag: 'Full Pathway',
    lives: '2,800+',
    categories: ['consciousness', 'spiritual-growth', 'life-transformation'],
    image: '/images/courses/complete-program.png',
    banner: '/images/courses/complete-banner.webp',
    grad: 'linear-gradient(135deg,#1a1033,#7a5cd6)',
    description:
      'An all-in-one transformation system designed for deep personal growth. This bundle integrates step-by-step consciousness acceleration with spiritual awakening practices to help you reach your highest potential.',
    outcome:
      'Perfect for those who are ready to expand their awareness, gain clarity, and step into a more aligned and purposeful life.',
    bonus:
      'Exclusive bonus: the first 35 students get a private 1-on-1 session with Zalah to receive tailored insights and direction.',
    bundleIncludes: ['accelerator', 'sa1', 'sa2'],
    bannerW: 1671,
    bannerH: 941,
    outcomes: [
      'Deepen your awareness',
      'Transform your mindset',
      'Heal and align your life',
      'Create lasting positive change',
    ],
    whoFor: [
      'Want the full pathway — Accelerator plus both Spiritual Awakening stages — in one enrolment.',
      'Ready for deep, sustained transformation work.',
      'Early enrollees: the first 35 students also receive a private 1-on-1 session with Zalah.',
    ],
    faqs: [
      {
        q: 'What is inside the program?',
        a: 'It bundles the 10-Part Consciousness Accelerator, Spiritual Awakening 1 and Spiritual Awakening 2 into a single enrolment.',
      },
      {
        q: 'How do I enrol and pay?',
        a: 'The Enroll Now button enrols you right here on this site, and the program opens in My Courses. The price is $2,199 USD.',
      },
      {
        q: 'Is there a bonus?',
        a: 'Yes — the first 35 students receive a private 1-on-1 session with Zalah for tailored insights and direction.',
      },
    ],
    seo: {
      title: 'Awakening & Consciousness Transformation Program — CFT by Zalah',
      desc: 'The complete path: the Consciousness Accelerator plus Spiritual Awakening 1 and 2 in one enrolment. $2,199 USD.',
    },
  },
];

export const getCourse = (id) => courses.find((c) => c.id === id || c.slug === id);

export const categoryLabel = (key) =>
  (courseCategories.find((c) => c.key === key) || {}).label || 'Program';

// Display names for collection teachings that are not standalone course
// records; taken from the official Mind & Life banner artwork.
export const bundleLabels = {
  'swimming-pool': 'Life is Like a Swimming Pool',
  valentines: 'Gain from Valentine’s Day',
  'earth-day': 'Earth Day',
  'psychology-of-meditation': 'Psychology of Meditation',
};

export const includeLabel = (ref) => {
  const inner = courses.find((c) => c.id === ref);
  return inner ? inner.name : bundleLabels[ref] || ref.replace(/-/g, ' ');
};

export const includeLink = (ref) => (courses.some((c) => c.id === ref) ? `/course/${ref}` : null);
