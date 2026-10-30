// The four inner journeys. Content supplied by the client (2026-10-13).
// Each journey drives both its Home card and its own page at /<slug>.

export const journeys = [
  {
    slug: 'consciousness',
    num: '01',
    title: 'Consciousness',
    icon: 'lotus',
    theme: 'Expand your awareness. Experience life from a higher perspective.',
    text: 'Expand your awareness and see life from a higher perspective.',
    image: '/images/journeys/consciousness.webp',
    imageSmall: '/images/journeys/consciousness-760.webp',
    focus: 'center 68%',
    hero: {
      eyebrow: 'The journey of awareness',
      heading: 'Consciousness —',
      headingAccent: 'Awaken to a Deeper Understanding of Life',
      lead: [
        'Discover a deeper relationship with yourself and the world around you. Consciousness begins with the ability to observe your thoughts, understand your emotions, and become aware of the patterns that influence your daily life.',
        'At the Centre for Transformation, we invite you to explore the art of conscious living through guided practices, timeless wisdom, meditation, and self-reflection.',
        'Learn to move beyond automatic reactions and develop a more thoughtful, balanced, and intentional approach to life.',
      ],
      primary: { label: 'Begin Your Journey', to: '/courses' },
      secondary: { label: 'Explore Our Practices', to: '#practice' },
    },
    sections: [
      {
        type: 'prose',
        label: 'What Is Consciousness?',
        heading: 'Understanding the Power of Awareness',
        body: [
          'Consciousness is our awareness of ourselves, our experiences, our surroundings, and the thoughts and feelings that arise within us.',
          'Much of daily life can become automatic. We repeat familiar habits, react emotionally to situations, and follow patterns without always noticing why.',
          'Developing awareness creates an opportunity to pause, observe, and choose how we respond.',
          'Rather than being controlled by every passing thought or emotion, we can learn to recognize our experiences with greater clarity and understanding.',
          'Conscious living does not mean eliminating difficult emotions or achieving a permanently peaceful mind. It means developing a healthier relationship with our experiences and responding to life with greater intention.',
        ],
        pointsTitle: 'Three key principles',
        points: [
          { term: 'Awareness', def: 'Notice your thoughts, emotions, and surroundings without immediately judging them.' },
          { term: 'Presence', def: 'Learn to give your attention to the present moment instead of becoming lost in the past or future.' },
          { term: 'Conscious Choice', def: 'Recognize your habitual reactions and create space for more thoughtful responses.' },
        ],
      },
      {
        type: 'benefits',
        label: 'Why Consciousness Matters',
        heading: 'See Life Through a New Perspective',
        intro: [
          'When you become more aware of your inner experiences, you begin to understand yourself more clearly.',
          'Consciousness practices can help you recognize emotional patterns, pay attention to your decisions, and develop a more intentional way of living.',
        ],
        listHeading: 'Benefits of Developing Awareness',
        items: [
          { title: 'Greater Self-Awareness', text: 'Understand your thoughts, emotional responses, personal values, and habitual behaviours.' },
          { title: 'Improved Emotional Understanding', text: 'Recognize your emotions without immediately reacting to them. Learn to approach challenging situations with patience and reflection.' },
          { title: 'Better Decision-Making', text: 'Become more aware of your motivations, priorities, and the possible consequences of your choices.' },
          { title: 'More Meaningful Relationships', text: 'Listen more attentively, communicate more thoughtfully, and become aware of how your behaviour affects others.' },
          { title: 'A Stronger Connection with the Present', text: 'Spend less time operating on autopilot and more time appreciating the experiences that make up your daily life.' },
          { title: 'Greater Personal Growth', text: 'Identify patterns that no longer serve you and create opportunities to develop healthier habits.' },
        ],
        note: 'These practices may support personal growth and well-being, but results differ from person to person.',
      },
      {
        type: 'dimensions',
        label: 'Explore the Different Dimensions of Consciousness',
        heading: 'Four Dimensions of Conscious Living',
        items: [
          {
            title: 'Self-Awareness',
            body: [
              'Understand who you are beyond your roles, routines, and expectations.',
              'Explore your values, beliefs, strengths, emotional patterns, and personal motivations.',
            ],
            practice: 'Spend five minutes each evening reflecting on your thoughts, emotions, and decisions.',
          },
          {
            title: 'Emotional Awareness',
            body: [
              'Learn to recognize your emotions and understand what may be influencing them.',
              'Instead of suppressing emotions or reacting immediately, practise observing them with curiosity.',
            ],
            practice: 'When an emotion arises, pause and ask yourself: What am I feeling? What might have triggered this feeling? How would I like to respond?',
          },
          {
            title: 'Present-Moment Awareness',
            body: [
              'Bring your attention to the experience of the present moment.',
              'Notice your breathing, sounds, physical sensations, and surroundings without needing to change them.',
            ],
            practice: 'Take three minutes each day to sit quietly and observe your breathing.',
          },
          {
            title: 'Conscious Living',
            body: [
              'Apply awareness to your everyday choices, relationships, work, and personal goals.',
              'Conscious living means aligning your actions more closely with your values.',
            ],
            practice: 'Before making an important decision, pause and ask whether your choice reflects what genuinely matters to you.',
          },
        ],
      },
      {
        type: 'practice',
        variant: 'routine',
        label: 'Begin Your Daily Awareness Practice',
        heading: 'A Simple Five-Minute Consciousness Exercise',
        intro: 'You do not need special equipment or previous meditation experience to begin.',
        items: [
          { label: 'Minute 1', title: 'Pause', text: 'Sit comfortably and allow yourself to become still. Put aside distractions for a moment.' },
          { label: 'Minute 2', title: 'Observe Your Breathing', text: 'Notice the natural rhythm of your breath. There is no need to force it or make it perfect.' },
          { label: 'Minute 3', title: 'Notice Your Thoughts', text: 'Allow thoughts to arise and pass. When your attention wanders, gently bring it back to the present.' },
          { label: 'Minute 4', title: 'Recognize Your Emotions', text: 'Ask yourself how you are feeling right now. Try to name the emotion without judging yourself for experiencing it.' },
          { label: 'Minute 5', title: 'Set an Intention', text: 'Choose one quality you would like to bring into the rest of your day, such as patience, kindness, curiosity, or courage.' },
        ],
        closing:
          'Small moments of awareness can become the foundation for meaningful change. Begin where you are, practise consistently, and allow your understanding to develop naturally.',
      },
      {
        type: 'faq',
        label: 'Frequently Asked Questions',
        items: [
          { q: 'Is consciousness the same as meditation?', a: 'No. Meditation is one practice that may help develop awareness. Consciousness is a broader subject involving awareness of experiences, thoughts, emotions, and surroundings.' },
          { q: 'Do I need previous experience to begin?', a: 'No. Beginners can start with simple breathing exercises, observation, and daily reflection.' },
          { q: 'How long should I practise each day?', a: 'Start with five minutes daily. Increase the duration gradually if it feels comfortable and useful.' },
          { q: 'Will practising consciousness remove negative thoughts?', a: 'Not necessarily. The aim is not to eliminate every difficult thought, but to become more aware of thoughts and learn to respond to them more constructively.' },
        ],
      },
      {
        type: 'cta',
        heading: 'Your Journey Begins with Awareness',
        body: [
          'You do not need to change your entire life in a single day. Begin by noticing one thought, understanding one emotion, or making one conscious choice.',
          'Every moment offers an opportunity to understand yourself a little better.',
        ],
        button: { label: 'Start Your Transformation', to: '/courses' },
        link: { label: 'Explore Self-Discovery', to: '/journey/self-discovery' },
      },
    ],
  },

  {
    slug: 'self-discovery',
    num: '02',
    title: 'Self-Discovery',
    icon: 'seeker',
    theme: 'Reconnect with your true self and uncover your unique path.',
    text: 'Reconnect with your true self and uncover your unique path.',
    image: '/images/journeys/self-discovery.webp',
    imageSmall: '/images/journeys/self-discovery-760.webp',
    focus: 'center 62%',
    hero: {
      eyebrow: 'The journey within',
      heading: 'Self-Discovery —',
      headingAccent: 'Understand Who You Truly Are',
      lead: [
        'Who are you beyond the expectations of others, the roles you play, and the responsibilities you carry?',
        'Self-discovery is the process of understanding your identity, values, strengths, emotions, motivations, and aspirations.',
        'As life becomes busy, it can be easy to lose touch with what genuinely matters to us. We may follow paths chosen by others without taking the time to consider whether those paths reflect our own values.',
        'At the Centre for Transformation, we encourage you to explore your inner world, question limiting assumptions, and develop a clearer understanding of the person you want to become.',
      ],
      primary: { label: 'Begin Self-Discovery', to: '/courses' },
      secondary: { label: 'Explore the Process', to: '#steps' },
    },
    sections: [
      {
        type: 'prose',
        label: 'What Is Self-Discovery?',
        heading: 'Meet Yourself Beyond the Expectations',
        body: [
          'Self-discovery is an ongoing process of learning about yourself through reflection, experience, observation, and personal exploration.',
          'It involves asking meaningful questions about what you believe, what motivates you, what you value, and what gives your life a sense of direction.',
          'You may discover strengths you have overlooked, habits that hold you back, or interests you have neglected while trying to meet other people’s expectations.',
          'The goal is not to create a perfect version of yourself. It is to develop a more honest, compassionate, and realistic understanding of who you are.',
          'Self-discovery allows you to make decisions based on greater self-understanding rather than simply following external pressure.',
        ],
      },
      {
        type: 'benefits',
        label: 'Why Self-Discovery Matters',
        heading: 'Build a Life That Reflects Who You Are',
        intro: [
          'When you understand yourself more clearly, you can make more intentional decisions about your relationships, career, personal growth, and future.',
        ],
        listHeading: 'Key Benefits',
        items: [
          { title: 'Clarity About Your Values', text: 'Identify the principles that matter most to you and use them to guide your decisions.' },
          { title: 'Recognition of Your Strengths', text: 'Understand your abilities, interests, and natural preferences so you can develop them more intentionally.' },
          { title: 'Awareness of Limiting Beliefs', text: 'Examine assumptions about yourself that may be holding you back from trying new things.' },
          { title: 'Greater Confidence in Your Decisions', text: 'Develop trust in your ability to reflect, evaluate options, and make choices aligned with your priorities.' },
          { title: 'Healthier Personal Boundaries', text: 'Understand your needs, communicate your limits, and recognize the importance of respecting both yourself and others.' },
          { title: 'A Clearer Sense of Direction', text: 'Explore what you want to learn, experience, contribute, and achieve in your life.' },
        ],
      },
      {
        type: 'steps',
        label: 'Four Steps to Self-Discovery',
        heading: 'A Process You Can Follow',
        items: [
          {
            title: 'Reflect on Your Past',
            body: [
              'Your experiences can offer valuable insights into your behaviour, values, and motivations.',
              'Consider the experiences that have shaped your outlook and the lessons you have learned from them.',
            ],
            question: 'Which experiences have had the greatest influence on the person I am today?',
          },
          {
            title: 'Understand Your Present',
            body: [
              'Pay attention to what energizes you, what drains you, and what makes you feel engaged.',
              'Observe your everyday habits and identify areas where your actions may not reflect your values.',
            ],
            question: 'Which parts of my current life feel meaningful, and which parts need attention?',
          },
          {
            title: 'Explore Your Possibilities',
            body: [
              'Give yourself permission to explore new interests, develop skills, and consider opportunities beyond your usual routines.',
              'You do not need to have your entire future planned before taking your next step.',
            ],
            question: 'What would I explore if I allowed myself to be curious instead of worrying about making mistakes?',
          },
          {
            title: 'Define Your Direction',
            body: [
              'Use what you learn about yourself to establish realistic personal goals.',
              'Your direction can change as you gain new experiences and develop a deeper understanding of your priorities.',
            ],
            question: 'What is one meaningful change I can make this month?',
          },
        ],
      },
      {
        type: 'practice',
        variant: 'exercise',
        label: 'Discover Your Core Values',
        heading: 'What Matters Most to You?',
        intro: 'Your values influence the way you make decisions, build relationships, and define success.',
        chipsLabel: 'Examples of personal values include:',
        chips: ['Honesty', 'Compassion', 'Freedom', 'Creativity', 'Family', 'Growth', 'Courage', 'Contribution', 'Learning', 'Balance'],
        exerciseLabel: 'Exercise',
        exercise: [
          'Choose five values that matter most to you.',
          'Narrow your list to three essential values.',
          'Consider whether your daily choices reflect these values.',
          'Identify one practical change that would bring your life into closer alignment with them.',
        ],
        example:
          'If personal growth is one of your core values, you might commit to reading regularly, learning a new skill, or seeking feedback that helps you improve.',
        closing: 'The objective is to turn self-understanding into meaningful action.',
      },
      {
        type: 'practice',
        label: 'Your Seven-Day Self-Discovery Journey',
        heading: 'A Week of Honest Questions',
        days: [
          'Write down your strengths and the qualities you appreciate about yourself.',
          'Identify the values that guide your most important decisions.',
          'Reflect on the situations that energize you and those that leave you feeling drained.',
          'Examine one limiting belief and consider whether it is supported by evidence.',
          'Identify a personal boundary that would improve your well-being or relationships.',
          'Explore one interest or activity you have wanted to try.',
          'Review your reflections and choose one realistic goal for the coming month.',
        ],
        closing:
          'Self-discovery is not a race toward a final destination. It is an ongoing relationship with yourself, built through curiosity, honesty, and consistent reflection.',
      },
      {
        type: 'faq',
        label: 'Frequently Asked Questions',
        items: [
          { q: 'How do I begin discovering myself?', a: 'Start by reflecting on your values, strengths, interests, and experiences. Journaling and trying new activities can help you understand yourself more clearly.' },
          { q: 'What if I do not know what I want in life?', a: 'You do not need to have all the answers immediately. Start by exploring your interests, identifying what matters to you, and taking small steps toward possibilities that appeal to you.' },
          { q: 'Can self-discovery improve my confidence?', a: 'It may help you develop confidence by increasing your understanding of your abilities, preferences, and values.' },
          { q: 'Is self-discovery a one-time process?', a: 'No. Your understanding of yourself can evolve as you experience new situations, develop relationships, and move through different stages of life.' },
        ],
      },
      {
        type: 'cta',
        heading: 'The Most Meaningful Journey Is the One Within',
        body: [
          'Give yourself the time and space to understand who you are, what you value, and the life you want to create.',
          'Your next chapter begins with a single honest question.',
        ],
        button: { label: 'Begin Your Journey', to: '/courses' },
        link: { label: 'Explore Inner Peace', to: '/journey/inner-peace' },
      },
    ],
  },

  {
    slug: 'inner-peace',
    num: '03',
    title: 'Inner Peace',
    icon: 'sun',
    theme: 'Find calm within, no matter what life brings.',
    text: 'Find calm within, no matter what life brings.',
    image: '/images/journeys/inner-peace.webp',
    imageSmall: '/images/journeys/inner-peace-760.webp',
    focus: 'center 55%',
    hero: {
      eyebrow: 'The art of inner balance',
      heading: 'Inner Peace —',
      headingAccent: 'Discover Calm Amid the Noise of Life',
      lead: [
        'Life brings responsibilities, uncertainty, changing circumstances, and moments of emotional difficulty. Although we cannot control everything that happens around us, we can learn ways to respond with greater awareness and balance.',
        'Inner peace is not about escaping the world or avoiding difficult emotions. It is about developing a healthier relationship with your thoughts, accepting what you cannot control, and responding to challenges with patience and clarity.',
        'Through mindfulness, reflection, gentle breathing exercises, and intentional living, you can begin creating moments of calm in your everyday life.',
      ],
      primary: { label: 'Discover Inner Peace', to: '/courses' },
      secondary: { label: 'Start a Calm Practice', to: '#practice' },
    },
    sections: [
      {
        type: 'prose',
        label: 'What Is Inner Peace?',
        heading: 'Peace Begins with Your Relationship with Yourself',
        body: [
          'Inner peace is a sense of emotional balance and acceptance that can help you navigate the changing circumstances of life.',
          'It does not mean that you will never feel sadness, anger, fear, or uncertainty. These emotions are natural parts of being human.',
          'Instead, inner peace involves recognizing your feelings without allowing every emotion to determine your actions.',
          'It means learning to pause before reacting, accepting that uncertainty is sometimes unavoidable, and directing your energy toward the things you can influence.',
          'Peace is not necessarily the absence of challenges. It can also be the ability to meet those challenges without losing touch with your values and priorities.',
        ],
      },
      {
        type: 'benefits',
        label: 'What Disturbs Our Inner Peace?',
        heading: 'Recognize the Patterns That Create Inner Tension',
        intro: ['Many everyday experiences can affect our sense of balance.'],
        listHeading: 'Common Sources of Inner Disturbance',
        items: [
          { title: 'Overthinking', text: 'Repeatedly reviewing past situations or imagining future problems can make it difficult to remain present.' },
          { title: 'Unrealistic Expectations', text: 'Expecting yourself or others to be perfect may create unnecessary pressure and disappointment.' },
          { title: 'Comparing Yourself with Others', text: 'Constant comparison can distract you from your own progress, values, and individual circumstances.' },
          { title: 'Trying to Control Everything', text: 'Attempting to control other people’s decisions or every possible outcome can increase frustration.' },
          { title: 'Difficulty Setting Boundaries', text: 'Taking on more responsibilities than you can comfortably manage may leave you feeling overwhelmed.' },
          { title: 'Neglecting Your Own Needs', text: 'Ignoring rest, meaningful relationships, recreation, and personal reflection can make everyday challenges harder to navigate.' },
        ],
        note: 'Understanding these patterns is the first step toward making more supportive choices.',
      },
      {
        type: 'dimensions',
        label: 'Six Practices for Cultivating Inner Peace',
        heading: 'Small Practices, Steady Calm',
        items: [
          {
            title: 'Mindful Breathing',
            body: [
              'Bring your attention to the natural rhythm of your breathing.',
              'Sit comfortably and notice each inhale and exhale. If your thoughts wander, gently return your attention to your breath.',
            ],
            practice: 'Two to five minutes.',
            practiceLabel: 'Suggested practice',
          },
          {
            title: 'Acceptance of What You Cannot Control',
            body: [
              'Separate the circumstances you can influence from those you cannot.',
              'You may not control another person’s behaviour or an unexpected event, but you can often choose your next action.',
            ],
            practice: 'What is within my control right now, and what can I allow to remain uncertain?',
            practiceLabel: 'Reflection question',
          },
          {
            title: 'Releasing Unhelpful Comparison',
            body: [
              'Recognize that every person has a different background, timeline, and set of circumstances.',
              'Instead of judging your progress against someone else’s achievements, consider whether you are moving toward your own goals.',
            ],
            practice: 'At the end of the day, identify one thing you did well or learned.',
          },
          {
            title: 'Creating Healthy Boundaries',
            body: [
              'Protecting your time and energy can help you maintain a more balanced life.',
              'Learn to communicate your needs respectfully and recognize when you need to pause, rest, or ask for support.',
            ],
            practice: 'Identify one commitment you need to reconsider and decide how to communicate your limits.',
          },
          {
            title: 'Practising Gratitude',
            body: [
              'Notice the people, experiences, and ordinary moments you appreciate.',
              'Gratitude does not require ignoring difficulties. It simply allows you to acknowledge positive experiences alongside life’s challenges.',
            ],
            practice: 'Write down three things you appreciated today.',
          },
          {
            title: 'Spending Time in Nature',
            body: [
              'Take time to walk outdoors, observe the sky, listen to natural sounds, or sit in a peaceful environment.',
              'For many people, time in nature provides a welcome opportunity to slow down and reconnect with the present.',
            ],
            practice: 'Spend ten minutes outdoors without unnecessary digital distractions, when practical.',
          },
        ],
      },
      {
        type: 'practice',
        label: 'Your Daily Inner Peace Routine',
        heading: 'Create Small Moments of Calm Every Day',
        items: [
          { label: 'Morning', title: 'Set Your Intention', text: 'Before beginning your daily responsibilities, take a few quiet moments to decide how you want to approach the day.' },
          { label: 'Afternoon', title: 'Pause and Reset', text: 'Step away from your current activity briefly. Stretch, breathe naturally, and notice how you are feeling.' },
          { label: 'Evening', title: 'Release the Day', text: 'Reflect on what went well, what challenged you, and what you learned. Allow yourself to recognize that not everything needs to be resolved immediately.' },
          { label: 'Before Sleep', title: 'Create Space for Rest', text: 'Reduce unnecessary stimulation and establish a comfortable bedtime routine.' },
        ],
        closing:
          'You do not have to create a perfectly peaceful life to experience moments of peace. Start with small practices that help you respond to life more intentionally.',
      },
      {
        type: 'faq',
        label: 'Frequently Asked Questions',
        items: [
          { q: 'Does inner peace mean never feeling angry or sad?', a: 'No. Inner peace does not eliminate normal human emotions. It involves learning to recognize and manage emotions in constructive ways.' },
          { q: 'Can meditation help me feel calmer?', a: 'Mindfulness and meditation may help some people manage stress and improve emotional awareness. Experiences and results vary.' },
          { q: 'How can I find peace during a difficult situation?', a: 'Pause when possible, acknowledge what you are feeling, identify what you can influence, and consider the next constructive step. Seek support when you need it.' },
          { q: 'How long does it take to develop inner peace?', a: 'There is no fixed timeline. Small, consistent practices may gradually help you develop skills for navigating everyday challenges.' },
        ],
      },
      {
        type: 'cta',
        heading: 'Make Space for the Peace You Deserve',
        body: [
          'Give yourself permission to slow down, breathe, and approach life with greater compassion.',
          'You cannot always choose what happens around you, but you can begin exploring how you respond.',
        ],
        button: { label: 'Begin Your Inner Peace Journey', to: '/courses' },
        link: { label: 'Explore Purpose', to: '/journey/purpose' },
      },
    ],
  },

  {
    slug: 'purpose',
    num: '04',
    title: 'Purpose',
    icon: 'sprout',
    theme: 'Live a more meaningful life and create a positive impact.',
    text: 'Live a more meaningful life and create a positive impact.',
    image: '/images/journeys/purpose.webp',
    imageSmall: '/images/journeys/purpose-760.webp',
    focus: 'center 58%',
    hero: {
      eyebrow: 'The journey toward meaning',
      heading: 'Purpose —',
      headingAccent: 'Discover What Makes Your Life Meaningful',
      lead: [
        'A meaningful life is not defined only by achievements, recognition, or material success. It can also be shaped by the values you live by, the relationships you nurture, the work you contribute, and the difference you make in the lives of others.',
        'Discovering your purpose is a process of understanding what matters to you and finding practical ways to express those values through your everyday choices.',
        'Your purpose does not need to be a single extraordinary mission. It may emerge through your work, creativity, relationships, service, learning, or the way you treat the people around you.',
        'At the Centre for Transformation, we encourage you to explore your interests, identify your strengths, and take meaningful steps toward a life that reflects your deepest values.',
      ],
      primary: { label: 'Discover Your Purpose', to: '/courses' },
      secondary: { label: 'Explore Your Path', to: '#dimensions' },
    },
    sections: [
      {
        type: 'prose',
        label: 'What Does It Mean to Live with Purpose?',
        heading: 'Move Beyond Success. Discover Meaning.',
        body: [
          'Purpose provides a sense of direction by connecting your actions with the things you consider important.',
          'For some people, purpose is expressed through meaningful work. For others, it may be found in family, creativity, learning, community service, spiritual exploration, or helping others grow.',
          'There is no single definition of a purposeful life that applies to everyone.',
          'Your purpose may evolve as your circumstances, priorities, and understanding of yourself change.',
          'Rather than waiting for a perfect answer, you can begin by noticing what inspires you, what responsibilities you care about, and what kind of contribution you want to make.',
          'A purposeful life is built through everyday decisions, not just major milestones.',
        ],
      },
      {
        type: 'benefits',
        label: 'Why Living with Purpose Matters',
        heading: 'Give Your Choices a Clearer Direction',
        intro: [
          'Understanding what matters to you can help you make decisions that feel more intentional and consistent with your values.',
        ],
        listHeading: 'Key Benefits of Purposeful Living',
        items: [
          { title: 'Greater Clarity', text: 'Recognize which goals deserve your attention and which commitments may not reflect your priorities.' },
          { title: 'Meaningful Motivation', text: 'Connect everyday actions with a reason that matters to you.' },
          { title: 'More Intentional Decisions', text: 'Evaluate opportunities by considering whether they align with your values and long-term direction.' },
          { title: 'A Stronger Sense of Contribution', text: 'Explore ways to use your abilities, knowledge, or experiences to support others.' },
          { title: 'Greater Resilience', text: 'A clear sense of what matters may help you maintain perspective when facing setbacks and uncertainty.' },
          { title: 'More Meaningful Relationships', text: 'Build stronger connections around shared values, mutual support, and genuine care.' },
        ],
        note: 'These benefits are possibilities rather than guarantees. Each person’s experience of purpose is different.',
      },
      {
        type: 'dimensions',
        label: 'Discover Your Personal Purpose',
        heading: 'Four Questions That Can Help You Find Your Direction',
        items: [
          {
            title: 'What Truly Matters to Me?',
            body: [
              'Identify the principles and experiences you want to prioritize.',
              'Consider whether your current lifestyle reflects those priorities.',
            ],
            practice: 'Write down five things that matter most to you. Choose one and identify how you could give it more attention this week.',
            practiceLabel: 'Exercise',
          },
          {
            title: 'What Am I Naturally Drawn Toward?',
            body: [
              'Notice the activities, subjects, and experiences that create curiosity or a sense of engagement.',
              'You do not need to be an expert in something for it to be worth exploring.',
            ],
            practice: 'List three activities you enjoy learning about or doing. Look for common themes.',
            practiceLabel: 'Exercise',
          },
          {
            title: 'What Strengths Can I Develop and Share?',
            body: [
              'Think about the abilities, knowledge, and personal qualities that you can continue to develop.',
              'These might include communication, creativity, leadership, problem-solving, teaching, or empathy.',
            ],
            practice: 'Ask someone you trust which strengths they have noticed in you. Compare their observations with your own.',
            practiceLabel: 'Exercise',
          },
          {
            title: 'How Would I Like to Contribute?',
            body: [
              'Consider the difference you want to make through your relationships, career, community, or everyday behaviour.',
              'Your contribution does not need to be large or publicly recognized to be meaningful.',
            ],
            practice: 'Identify one small action that could make a positive difference to another person.',
            practiceLabel: 'Exercise',
          },
        ],
      },
      {
        type: 'prose',
        id: 'framework',
        label: 'The Purpose Alignment Framework',
        heading: 'Bring Your Values, Strengths, and Actions Together',
        body: ['A practical way to explore purpose is to consider four connected areas.'],
        pointsTitle: 'Four connected areas',
        points: [
          { term: 'Values — What Matters to You?', def: 'Identify the principles you want to guide your decisions.' },
          { term: 'Strengths — What Can You Offer?', def: 'Recognize your abilities and the skills you want to develop.' },
          { term: 'Interests — What Inspires Your Curiosity?', def: 'Explore the activities, questions, and subjects that engage you.' },
          { term: 'Contribution — Where Can You Make a Difference?', def: 'Identify how your values, abilities, and interests can benefit your own life and the lives of others.' },
        ],
        exampleLabel: 'Example',
        example:
          'Imagine that someone values education, enjoys explaining complex ideas, and has strong communication skills. They might explore mentoring, teaching, creating educational resources, or helping others develop professional skills.',
        closing:
          'This is not a formula for discovering one permanent purpose. It is a practical starting point for identifying meaningful possibilities.',
      },
      {
        type: 'steps',
        label: 'Turn Your Purpose into Action',
        heading: 'Your Purpose Becomes Real Through Your Choices',
        intro: 'You do not need to transform your entire life at once. Start with small actions that move you toward what matters.',
        items: [
          { title: 'Choose One Priority', body: ['Identify an area of life you want to develop, such as relationships, learning, career, creativity, or community contribution.'] },
          { title: 'Set a Meaningful Goal', body: ['Choose a specific, realistic goal that reflects your priority.'] },
          { title: 'Identify Your Next Action', body: ['Break the goal into a step you can take within the next seven days.'] },
          { title: 'Review Your Progress', body: ['At the end of the week, reflect on what you learned and what needs to change.'] },
          { title: 'Adjust Your Direction', body: ['Allow your goals to evolve as you gain experience and discover more about yourself.'] },
        ],
      },
      {
        type: 'practice',
        label: 'A Seven-Day Purpose Discovery Exercise',
        heading: 'Seven Days to a Clearer Direction',
        days: [
          'Identify your five most important personal values.',
          'Write down the activities that make you feel interested, engaged, or fulfilled.',
          'Reflect on your strengths and the skills you would like to develop.',
          'Identify a problem, cause, or community need that matters to you.',
          'Imagine what a meaningful ordinary day would look like for you.',
          'Choose one small action that reflects your values.',
          'Review your reflections and write down one goal for the coming month.',
        ],
        closing:
          'You do not need to know exactly where your journey will lead. You only need enough clarity to take the next meaningful step.',
      },
      {
        type: 'faq',
        label: 'Frequently Asked Questions',
        items: [
          { q: 'What if I do not know my purpose yet?', a: 'That is completely normal. Explore your interests, values, strengths, and experiences. Your understanding may develop gradually as you try new things.' },
          { q: 'Can my purpose change over time?', a: 'Yes. Your priorities and responsibilities may evolve throughout life. It is natural for your understanding of purpose to change with them.' },
          { q: 'Does purpose have to be related to my career?', a: 'No. Purpose can be expressed through relationships, family, creativity, community involvement, learning, service, and many other aspects of life.' },
          { q: 'How do I know if I am living purposefully?', a: 'Consider whether your everyday choices increasingly reflect your values and whether you are making time for the things you consider meaningful.' },
        ],
      },
      {
        type: 'cta',
        heading: 'Create a Life That Reflects What Matters Most',
        body: [
          'Your purpose does not have to be discovered all at once.',
          'Start with your values. Explore your strengths. Take small steps toward meaningful goals.',
          'Over time, those choices can help you build a life that feels more intentional and connected to what matters to you.',
        ],
        button: { label: 'Begin Your Purpose Journey', to: '/courses' },
        link: { label: 'Return to Consciousness', to: '/journey/consciousness' },
      },
    ],
  },
];

export const getJourney = (slug) => journeys.find((j) => j.slug === slug);
export const relatedJourneys = (slug) => journeys.filter((j) => j.slug !== slug);
