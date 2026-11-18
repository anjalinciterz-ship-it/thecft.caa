/* Zalah's own portrait in the widths the layouts that show it can ask for. The
   compact hero frame is 33 or 34 per cent of the viewport, so a phone needs 350
   device pixels and a tablet at the 1000px break needs 700; past that the
   composition is a desktop one and the portrait layer is not in the document at
   all, which is why the hero stops at 700 rather than offering the full file to
   a sharp tablet. The facilitator band is wider and does keep the original. */
const portraitCandidates =
  '/images/site/zalah-facilitator-350.webp 350w, /images/site/zalah-facilitator-700.webp 700w';
const bandPortraitCandidates = `${portraitCandidates}, /images/site/zalah-facilitator.jpg 1086w`;

export const site = {
  name: 'The Centre for Transformation',
  shortName: 'CFT',
  tagline: 'Conscious People · A Kinder World · A Brighter Tomorrow',
  mission:
    'Our mission is to lead the world in helping every life feel joyful, balanced, significant and above all… LOVED.',
  quote: { text: 'A kinder world begins within.', by: 'Zalah' },
  philosophy: 'I provide you with philosophy. It is not your truth until you have lived it.',
  address: {
    line1: 'Suite 193-16 Midlake Blvd. SW',
    line2: 'Calgary, Alberta, T2X 2X7, Canada',
  },
  email: 'info@thecft.ca',
  phone: '403-278-8859',
  contactSubjects: ['Course Question', 'Wisdom Class', 'Technical Support', 'Something Else'],
  calendly: 'https://calendly.com/iamzale/new-meeting',
  tedTalk: 'https://youtu.be/wdoNDS54yGw',
  /* The wordmark is a pixel-for-pixel webp re-encode of logo-white.png, which
     stays in the library as the original. Nothing outside these pages reads
     either file. */
  logo: '/images/logo/logo-white.webp',
  logoColor: '/images/logo/logo-color.png',
  // The navbar and footer never draw the crest wider than 132 CSS pixels, and
  // the 720px original cost 40 KB to do it.
  crest: '/images/logo/peacock-feather-cosmic-288.webp',
  portrait: '/images/site/zalah-facilitator.jpg',
  portraitSrcSet: bandPortraitCandidates,
  hero: {
    eyebrow: 'Welcome to The Centre for Transformation',
    titleLead: 'Navigate Life’s Transformations with',
    titleAccent: 'Heart-Centered Guidance',
    lead:
      'Discover expert teachings and guided self-growth that blend timeless wisdom with spirituality & science, from beginner concepts to advanced consciousness work, led live by Zalah.',
    features: [
      { icon: 'leaf', label: 'Self-Paced Learning' },
      { icon: 'users', label: 'Live Interactive Classes' },
      { icon: 'globe', label: 'A Global Community' },
    ],
    footnote: 'Greater awareness · A kinder tomorrow',
    tedx: { label: 'Speaker', talk: 'Integrity & Life on the Planet' },
    classCard: { line1: 'Wednesday Evening', line2: 'Wisdom Class' },
  },
  /* The hero rotates through these in order. Every slide is composed live: the
     artwork is a text-free photograph that fills the frame, and the words over
     it are real HTML that animates as the slide takes the stage. `kind:'live'`
     marks the original cosmic composition, which keeps its floating TEDx cred,
     wisdom card and quote; the banners supply only background + copy.
     He asked for the cosmic one to open the rotation, and it is the slide whose
     artwork index.html preloads: the first entry is the one that loads eager and
     paints the LCP, so the two must stay in step. */
  heroSlides: [
    { key: 'cosmic', kind: 'live', title: 'Zalah welcomes you' },
    {
      key: 'guidance',
      kind: 'banner',
      title: 'Heart-Centered Guidance',
      src: '/images/site/hero-bg-guidance.webp',
      srcSet: '/images/site/hero-bg-guidance-900.webp 900w, /images/site/hero-bg-guidance.webp 1824w',
      alt: 'Zalah, smiling with his head resting on his hand, beside a rustic signpost in the desert',
      // The frame the browser reserves before the file arrives. The picture and
      // its 900w twin share this ratio, so no candidate can disagree with it.
      width: '1824',
      height: '862',
      // Where each photograph is framed once the hero becomes a portrait or a
      // tablet frame, both narrower than the picture: cover keeps the whole
      // height, so these are horizontal windows around the subject.
      mobilePos: '55% 50%',
      tabletPos: '58% 50%',
      /* The banner is one flat picture: Zalah and the signpost share the same
         pixels, so a phone frame can only show it by cover-cropping, and that
         magnifies him until his head fills the screen. Measured from the file,
         his shirt reaches x 1455 and the signpost's first board starts at 1505,
         so the picture has exactly one full-height column that carries the
         whole signpost and none of him. That column is the compact background.
         Same photograph, nothing retouched. */
      compactArt: {
        /* One candidate, no width descriptor. A compact frame covers a 2.11:1
           photograph by height, not by width, so it always shows the same
           467px slice of it however wide the file is: this 364px window of the
           same picture paints the identical crop at the identical scale for a
           third of the bytes, and the full file can add no detail behind it. */
        src: '/images/site/hero-bg-guidance-window.webp',
        srcSet: '/images/site/hero-bg-guidance-window.webp',
        pos: '50% 50%',
        tabletPos: '50% 50%',
      },
      /* The sentence rides the signpost, one word per plank. The coordinates
         are the plank bands measured out of the photograph itself, as
         percentages of the frame: on the desktop stage the frame and the image
         share the 1824/862 box, so nothing is cropped and they line up exactly.
         Below 1000px the frame is a slice of the picture, so the words fall
         back to one line over the artwork. */
      planks: [
        { word: 'YOU', x: 90.1, y: 33.99 },
        { word: 'ARE', x: 86.87, y: 40.89 },
        { word: 'EXACTLY', x: 90.68, y: 47.33 },
        { word: 'WHERE', x: 87.55, y: 53.25 },
        { word: 'YOU', x: 90.71, y: 59.63 },
        { word: 'NEED', x: 87.77, y: 66.76 },
        { word: 'TO', x: 90.82, y: 72.91 },
        { word: 'BE', x: 89.31, y: 80.16 },
      ],
      copy: {
        eyebrow: 'Welcome to The Centre for Transformation',
        titleLead: 'Navigate Life’s Transformations with',
        titleAccent: 'Heart-Centered Guidance',
        lead: 'Discover expert teachings and guided self-growth that blend timeless wisdom with spirituality & science, from beginner concepts to advanced consciousness work, led live by Zalah.',
        ctaPrimary: 'Explore Courses',
        ctaSecondary: 'Join Wednesday Wisdom Class',
        features: ['Self-Paced Learning', 'Live Interactive Classes', 'A Global Community'],
        footnote: 'Greater awareness · A kinder tomorrow',
      },
    },
    {
      key: 'lake',
      kind: 'banner',
      title: 'Discover Inner Peace',
      src: '/images/site/hero-bg-lake.webp',
      srcSet: '/images/site/hero-bg-lake-900.webp 900w, /images/site/hero-bg-lake.webp 1824w',
      alt: 'A woman sitting on a wooden dock, meditating by a mountain lake',
      width: '1824',
      height: '862',
      // She sits a hair left of the picture's centre, so the phone and tablet
      // windows are pulled to her rather than to the middle of the frame.
      mobilePos: '47% 50%',
      tabletPos: '48% 50%',
      /* Covering a 2.11:1 photograph in a portrait frame keeps its whole height,
         so no amount of horizontal positioning can leave the woman and her dock
         behind: they are painted across the bottom of the picture. This window
         is the one full-height column of the same photograph that holds neither,
         measured from the file: she occupies x 965-1100 and the dock's far corner
         reaches x 1420, so the window opens at 1430. It keeps the range, the
         shore and the mirrored water, at the native resolution of that column. */
      compactArt: {
        src: '/images/site/hero-bg-lake-window.webp',
        srcSet: '/images/site/hero-bg-lake-window.webp',
        pos: '50% 50%',
        tabletPos: '50% 50%',
      },
      copy: {
        eyebrow: 'The Centre for Transformation',
        titleLead: 'Discover Inner Peace',
        titleAccent: 'and Lasting Change',
        lead: 'Practical teachings, guided practices, and conscious insights to help you grow, heal, and live a more meaningful life.',
        ctaPrimary: 'Explore Courses',
        ctaSecondary: 'Join the Next Wisdom Class',
        features: ['Live Classes', 'Self-Paced Courses', 'A Global Community'],
        footnote: 'Greater awareness · A kinder tomorrow',
      },
    },
    {
      key: 'path',
      kind: 'banner',
      title: 'A Clearer Path',
      src: '/images/site/hero-bg-path.webp',
      srcSet: '/images/site/hero-bg-path-900.webp 900w, /images/site/hero-bg-path.webp 1824w',
      alt: 'Zalah welcoming you beside a path through grass, with a man walking on it',
      width: '1824',
      height: '862',
      mobilePos: '71% 50%',
      tabletPos: '75% 50%',
      /* Same split as the signpost slide, from the same picture. Its left-hand
         window is the whole green corridor: the path, the hedges either side
         and the trees over them, with no part of Zalah in it. His own portrait
         stands in front of that as a layer of its own. */
      compactArt: {
        // The same window rule as the signpost slide, taken from the left edge
        // this time: 1140px of a picture that only ever shows 467 of them.
        src: '/images/site/hero-bg-path-window.webp',
        srcSet: '/images/site/hero-bg-path-window.webp',
        pos: '0% 50%',
        tabletPos: '0% 50%',
      },
      copy: {
        eyebrow: 'A path of awareness, growth & transformation',
        titleLead: 'Walk a Clearer Path to a More Conscious,',
        titleAccent: 'Fulfilled Life',
        lead: 'Practical teachings, timeless wisdom, and heart-centered guidance to help you grow, heal, and live with greater clarity, compassion, and purpose.',
        ctaPrimary: 'Explore the Teachings',
        ctaSecondary: 'Join a Live Wisdom Class',
        features: ['Inner Growth', 'Guided Practices', 'A Supportive Global Community'],
        footnote: 'A more aware · kinder · purposeful world',
      },
    },
  ],
  socials: [
    {
      key: 'IG',
      icon: 'instagram',
      label: 'Instagram',
      handle: '@thecft.cabyzalah',
      url: 'https://www.instagram.com/thecft.cabyzalah/',
    },
    { key: 'FB', icon: 'facebook', label: 'Facebook', handle: '@theCFTgroup', url: 'https://www.facebook.com/theCFTgroup' },
    { key: 'TT', icon: 'tiktok', label: 'TikTok', handle: '@zalahthecft', url: 'https://www.tiktok.com/@zalahthecft' },
    {
      key: 'YT',
      icon: 'youtube',
      label: 'YouTube',
      handle: '@Zalah-TheCFT',
      url: 'https://www.youtube.com/channel/UCIeen6ekT0toGlNPg1EATnQ',
    },
  ],
  wisdomClass: {
    title: 'Wednesday Evening Wisdom Class',
    image: '/images/site/wednesday-call.webp',
    when: '7:00 PM Mountain Time · Free',
    cadence: 'Every Wednesday',
    blurb:
      'Experience transformation every Wednesday at 7:00 PM (MT) with our free weekly sessions led by Zalah. Discover new spiritual insights with the opportunity to participate and ask questions to deepen your journey.',
    benefits: [
      'Interactive Q&A with Zalah.',
      'Connect with like-minded individuals in engaging group sessions.',
      'Practical tools you can apply the same week.',
      'Increase self-awareness and enhance self-discovery.',
      'Improve relationships.',
      'Accelerate your personal goals.',
    ],
  },
  nav: [
    { to: '/', label: 'Home' },
    { to: '/about', label: 'About Us' },
    { to: '/courses', label: 'Courses' },
    { to: '/books', label: 'Books' },
    { to: '/blog', label: 'Blog' },
    { to: '/testimonials', label: 'Testimonials' },
    { to: '/faq', label: 'FAQs' },
    { to: '/connect', label: 'Connect Us' },
  ],
  footerAccount: [
    { to: '/login', label: 'Login' },
    { to: '/signup', label: 'Get Started' },
    { to: '/dashboard', label: 'My Courses' },
    { to: '/connect', label: 'Connect Us' },
  ],
  stats: [
    { value: '20+', label: 'Years of Experience', note: 'A lifetime journey of learning, sharing and empowering others.' },
    { value: '1000+', label: 'Lives Touched', note: 'Individuals supported on their path to inner peace and self-transcendence.' },
    { value: 'Global', label: 'Community', note: 'A growing network of kind-hearted people across the world.' },
    { value: 'A Kinder', label: 'World', note: 'Because a brighter tomorrow begins with a kinder you.' },
  ],
  purpose: [
    {
      num: '01',
      icon: 'lotus',
      title: 'Our Mission',
      text: 'To inspire and support individuals toward greater self-awareness, inner peace and purposeful living.',
      foot: 'PEOPLE · PURPOSE · PROGRESS',
    },
    {
      num: '02',
      icon: 'sun',
      title: 'Our Vision',
      text: 'A kinder, more conscious world where people live with clarity, compassion and purpose.',
      foot: 'A MORE CONSCIOUS TOMORROW',
    },
    {
      num: '03',
      icon: 'heart',
      title: 'Our Values',
      text: 'Authenticity, compassion, growth, integrity and service to humanity.',
      foot: 'REAL VALUES, REAL IMPACT',
    },
    {
      num: '04',
      icon: 'users',
      title: 'Our Community',
      text: 'A safe and supportive space for real people, real conversations and real transformation.',
      foot: 'TOGETHER FOR A BRIGHTER WORLD',
    },
  ],
  approach: {
    points: [
      'Practical tools for everyday life.',
      'Deep spiritual insights.',
      'A supportive and mature community.',
      'Guidance for lasting transformation.',
    ],
  },
  facilitator: {
    script: ['A Kinder', 'Tomorrow', 'Begins Within'],
    name: 'ZALAH',
    role: 'Speaker. Guide. Mentor. A Brighter Tomorrow.',
    paras: [
      'Accomplished entrepreneur, distinguished TEDx speaker and seeker of infinite wisdom. For over two decades, Zalah has been an inspiration and guiding light for those on the path of true self-discovery and inner transformation.',
      'His profound teachings have inspired countless students, including certified coaches who continue to carry forward his legacy of enlightenment.',
    ],
    tedx: ['Ideas for a Kinder,', 'Brighter World'],
    stats: [
      { icon: 'book', title: '20+ Years', text: 'Guiding Transformation' },
      { icon: 'mic', title: 'TEDx Speaker', text: 'Sharing Ideas for a Kinder World' },
      { icon: 'users', title: 'Thousands', text: 'Lives Touched Globally' },
      { icon: 'lotus', title: 'Infinitely', text: 'Inspiring Future Generations' },
    ],
    quote: {
      text: 'Transformation begins the moment you choose a kinder, more expanded you.',
      by: 'ZALAH',
    },
    foot: ['Greater Awareness', 'A Kinder Tomorrow'],
  },
};
