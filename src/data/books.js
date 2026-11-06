// The three Zalah books, in the order the client specified (2026-10-13).
// Copy is transcribed verbatim from the client's own books-page document.
// `src` values are media ids resolved by src/media/protected.js — the files
// themselves live in the repo-root media/ folder, outside the web bundle.

export const books = [
  {
    slug: 'the-secret-of-creation',
    num: 'BOOK 01',
    title: 'The Secret of Creation',
    subtitle: 'When Nothing Matters',
    author: 'Zalah',
    cover: {
      front: '/images/books/secret-of-creation-front.webp',
      frontSmall: '/images/books/secret-of-creation-front-560.webp',
      back: '/images/books/secret-of-creation-back.webp',
      backSmall: '/images/books/secret-of-creation-back-560.webp',
    },
    blurb:
      'This is a book for parents to read to children about life values. It invites readers to explore the wisdom of the Self, rediscover spirit, and reflect on the values that can help shape a better world.',
    hero: {
      eyebrow: 'The Writings of Zalah',
      heading: 'The Secret of Creation',
      subheading: 'When Nothing Matters',
      intro: [
        'This is a book for parents to read to children about life values. Within every awakening soul lies a deep and ancient wisdom, buried, forgotten, and waiting to be awakened.',
      ],
      quote:
        'The Secret of Creation is a journey of awakening, remembrance, and discovery, an invitation to reconnect with the wisdom of the Self and the secret of creation.',
    },
    sections: [
      {
        type: 'prose',
        heading: 'A Journey to Discovering the Divine Self',
        body: [
          'Discover a journey of reflection and understanding through the themes of life values, awakening, and reconnecting with the deeper wisdom within.',
        ],
      },
      {
        type: 'explore',
        heading: 'Discover the Message of the Book',
        body: [
          'The Secret of Creation encourages readers to reflect on the values that shape their lives and the world they help create.',
          'It offers an opportunity for parents, grandparents, and children to explore meaningful questions together and develop a deeper appreciation for life.',
        ],
        listHeading: 'What You Can Explore',
        items: [
          'The importance of life values.',
          'Awareness and personal reflection.',
          'The relationship between the individual and the world.',
          'Rediscovering a sense of connection and meaning.',
        ],
      },
    ],
    audio: {
      heading: 'The Audiobook',
      groups: [
        {
          label: 'Part One',
          tracks: [1, 2, 3, 4, 5, 6].map((n) => ({
            label: `Part One · Track ${n}`,
            src: `audio/secret-of-creation/part-one-track-${String(n).padStart(2, '0')}.m4a`,
          })),
        },
        {
          label: 'Part Two',
          tracks: [1, 2].map((n) => ({
            label: `Part Two · Track ${n}`,
            src: `audio/secret-of-creation/part-two-track-${String(n).padStart(2, '0')}.m4a`,
          })),
        },
      ],
    },
  },

  {
    slug: 'caught-in-the-act',
    num: 'BOOK 02',
    title: 'CAUGHT in the ACT',
    subtitle: 'Book Two of the Atom and Noah Series',
    author: 'Zalah',
    cover: {
      front: '/images/books/caught-in-the-act-front.webp',
      frontSmall: '/images/books/caught-in-the-act-front-560.webp',
      back: '/images/books/caught-in-the-act-back.webp',
      backSmall: '/images/books/caught-in-the-act-back-560.webp',
    },
    blurb:
      'The second book in the Atom and Noah series. Written for adults and grandparents to read to children, it continues the exploration of life values, truth consciousness, and the transformational journey of the human spirit.',
    hero: {
      eyebrow: 'The Writings of Zalah',
      heading: 'CAUGHT in the ACT',
      subheading: 'Book Two of the Atom and Noah Series',
      intro: [
        'This is book two for adults and grandparents to read to children about life values.',
        'The second book in the Atom and Noah series, CAUGHT in the ACT continues the exploration of truth consciousness and the transformational journey of the human spirit.',
      ],
      quote: null,
    },
    sections: [
      {
        type: 'explore',
        heading: 'Discover the Story and Its Message',
        body: [
          'CAUGHT in the ACT continues the journey of exploring life values through the Atom and Noah series.',
          'The book invites readers to reflect on truth, awareness, personal choices, and the ways our understanding influences how we experience life.',
        ],
        listHeading: 'What You Can Explore',
        items: [
          'Truth and awareness.',
          'Life values and personal responsibility.',
          'Questions that encourage meaningful conversations.',
          'The journey of personal and spiritual transformation.',
        ],
      },
      {
        type: 'prose',
        heading: 'The Atom and Noah Series',
        body: [
          'Through stories and reflections, the series creates opportunities for adults and children to discuss important values and questions about life.',
          'Parents and grandparents can use these themes to encourage curiosity, understanding, and thoughtful conversations with younger readers.',
        ],
      },
    ],
    // Track 5 was never supplied — the numbering keeps the gap visible.
    audio: {
      heading: 'The Audiobook',
      groups: [
        {
          label: null,
          tracks: [1, 2, 3, 4, 6, 7, 8, 9].map((n) => ({
            label: `Track ${n}`,
            src: `audio/caught-in-the-act/track-${String(n).padStart(2, '0')}.mp3`,
          })),
        },
      ],
    },
  },

  {
    slug: 'the-big-three',
    num: 'BOOK 03',
    title: 'The BIG Three',
    subtitle: 'Three Ways Spirit Is Trying to Get Your Attention and How to Get Back Into the Flow',
    author: 'Zalah',
    cover: {
      front: '/images/books/big-three-front.webp',
      frontSmall: '/images/books/big-three-front-560.webp',
      back: '/images/books/big-three-back.webp',
      backSmall: '/images/books/big-three-back-560.webp',
    },
    blurb:
      'Three Ways Spirit Is Trying to Get Your Attention and How to Get Back Into the Flow. Explore three dynamics that can leave us feeling caught and struggling in life, and discover how greater awareness can help us reconnect with our authentic Self.',
    hero: {
      eyebrow: 'The Writings of Zalah',
      heading: 'The BIG Three',
      subheading:
        'Three Ways Spirit Is Trying to Get Your Attention and How to Get Back Into the Flow',
      intro: [
        'The BIG Three is a short book exploring the three dynamics that can keep us caught and struggling in life.',
      ],
      quote: 'Three ways Spirit is trying to get your attention and how to get back into the flow.',
      introAfterQuote: [
        'Through greater awareness and understanding, the book invites readers to reconnect with their authentic Self, find peace of mind, and move toward greater freedom.',
      ],
    },
    sections: [
      {
        type: 'prose',
        heading: 'A Journey Toward Understanding and Freedom',
        body: [
          'Explore the ideas presented in The BIG Three and reflect on the patterns that influence your choices, experiences, and relationship with yourself.',
        ],
      },
      {
        type: 'explore',
        heading: 'Explore the Deeper Message',
        body: [
          'The BIG Three invites readers to become more aware of the dynamics that may influence their lives. Through reflection and understanding, readers can explore new ways of approaching challenges and reconnecting with their authentic Self.',
        ],
        listHeading: 'What You Can Explore',
        items: [
          'Greater self-awareness.',
          'Recognizing patterns that influence everyday life.',
          'Finding a renewed sense of perspective.',
          'Exploring peace of mind and personal freedom.',
          'Developing a more conscious relationship with life.',
        ],
      },
      {
        type: 'prose',
        heading: 'Reconnect with Your Authentic Self',
        body: [
          'Personal transformation can begin with the willingness to observe, reflect, and understand your experiences from a new perspective.',
          'The BIG Three offers an invitation to explore that process and consider how greater awareness may help you move forward.',
        ],
      },
    ],
    audio: null,
  },
];

// The children's meditation on the books page, in the two-part shape he laid
// out on 2026-11-06. He has not sent the video files yet, so `src` stays null
// and the page paints a placeholder in each slot; filling one in is a one-line
// change per part. The old "Walk in the Woods" audio is gone by his request.
export const meditation = {
  kind: 'A Special Meditation Experience',
  title: 'A Kids Meditation by Zalah',
  intro:
    'For the best experience, watch Part 1 first, then continue to Part 2. Both videos can be played directly on this page. Take a peaceful moment to relax, explore your imagination, and enjoy this children’s meditation experience with Zalah.',
  parts: [
    {
      num: '01',
      tag: 'Must watch before meditating',
      heading: 'Part 1: Introduction to the Meditation',
      body: 'Please watch this introduction before starting the meditation. It will help you understand the experience and get ready for the guided meditation in Part 2.',
      src: null,
      poster: null,
    },
    {
      num: '02',
      // No tag on Part 2 — his layout marks up only the introduction.
      tag: null,
      heading: 'Part 2: Start Your Meditation',
      body: 'Once you have watched the introduction, you are ready to begin. Find a comfortable, quiet place, press play, and enjoy the full guided kids meditation with Zalah.',
      src: null,
      poster: null,
    },
  ],
};

export const getBook = (slug) => books.find((b) => b.slug === slug);

export const bookNeighbours = (slug) => {
  const i = books.findIndex((b) => b.slug === slug);
  return { prev: i > 0 ? books[i - 1] : null, next: i >= 0 && i < books.length - 1 ? books[i + 1] : null };
};

// Recorded sessions, guides and bundles from the live WooCommerce shop.
export const resources = [
  {
    id: 'seeing-life-through-divine-eyes',
    image: '/images/books/seeing-life-through-divine-eyes.png',
    title: 'Seeing Life Through Divine Eyes',
    type: 'book',
    price: 29,
    tagline: 'A shift in perception that changes how you meet every day.',
    description:
      'Zalah’s teachings on moving out of social consciousness and into a higher, more loving way of seeing yourself and the world around you.',
    grad: 'linear-gradient(135deg,#3a2a63,#7a5cd6)',
  },
  {
    id: 'life-is-like-a-swimming-pool',
    image: '/images/books/life-is-like-a-swimming-pool.png',
    title: 'Life is Like a Swimming Pool',
    type: 'book',
    price: 15,
    tagline: 'A simple, lasting metaphor for staying afloat and growing.',
    description:
      'A short, practical read taken from the classes: the analogy students quote most, expanded into a book you can live with.',
    grad: 'linear-gradient(135deg,#5b3fa6,#c9973e)',
  },
  {
    id: 'the-psychology-of-meditation',
    image: '/images/books/the-psychology-of-meditation.webp',
    title: 'The Psychology of Meditation',
    type: 'book',
    price: null,
    tagline: 'Understand what actually happens when you sit in stillness.',
    description:
      'The mechanics behind the meditation methods taught at CFT: why they work, what to expect, and how to make the practice stick.',
    grad: 'linear-gradient(135deg,#2f2258,#5b3fa6)',
  },
  {
    id: 'medifestation',
    image: '/images/books/medifestation.png',
    title: 'Medifestation, Awaken the True Power of Guided Meditation & Manifestation (Level 1)',
    type: 'course',
    price: 29,
    tagline: 'Meditation and manifestation working together.',
    description:
      'Awaken your consciousness and harness unlimited possibilities. Delivered online through the customer portal, 24/7, anywhere in the world.',
    grad: 'linear-gradient(135deg,#c9973e,#5b3fa6)',
  },
  {
    id: 'level-1-meditation-course',
    image: '/images/books/level-1-meditation-course.webp',
    title: 'The CFT’s Level 1 Meditation Course',
    type: 'course',
    price: 29,
    tagline: 'The foundation every CFT student begins with.',
    description:
      'Learn the CFT meditation methods that students describe as relaxing, de-stressing and focus-giving, the entry point to the wider pathway.',
    grad: 'linear-gradient(135deg,#1a1033,#7a5cd6)',
  },
  {
    id: 'valentines',
    image: '/images/books/valentines-day-webinar.jpg',
    title: 'A Spiritual Message of Valentine’s Day',
    type: 'webinar',
    price: null,
    tagline: 'A webinar on love, freedom and connection.',
    description: 'A recorded webinar drawing on the Love and Freedom teachings from the Consciousness Accelerator.',
    grad: 'linear-gradient(135deg,#5b3fa6,#c9973e)',
  },
  {
    id: 'earth-day',
    image: '/images/books/earth-day-bundle.png',
    title: 'Earth Day, The Complete Healing The Earth Bundle',
    type: 'bundle',
    price: null,
    tagline: 'A collection on connection with the living world.',
    description: 'A bundle drawn from the classes, focused on sacredness, stillness and our relationship with the Earth.',
    grad: 'linear-gradient(135deg,#3a2a63,#c9973e)',
  },
  {
    id: 'christmas',
    image: '/images/books/christmas-webinar.png',
    title: 'Bringing the Magic Back to Christmas',
    type: 'webinar',
    price: null,
    tagline: 'A seasonal teaching on presence and meaning.',
    description: 'A recorded session on keeping the season grounded in something more meaningful than the routine of it.',
    grad: 'linear-gradient(135deg,#2f2258,#c9973e)',
  },
];

export const resourceGroups = [
  { key: 'book', label: 'Books' },
  { key: 'course', label: 'Courses & Guides' },
  { key: 'webinar', label: 'Webinars' },
  { key: 'bundle', label: 'Bundles' },
];
