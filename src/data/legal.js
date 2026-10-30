import { site } from './site';

// DRAFT legal documents. Written to the shape of PIPEDA's fair information
// principles and Alberta's PIPA, but NOT reviewed by a lawyer and NOT legal
// advice. Replace every CONFIRM marker before publishing.
export const DRAFT_NOTE =
  'This is a draft prepared for review. It has not been read or approved by a lawyer, it is not legal advice, and it does not bind you or us until it is adopted and published as final.';

export const OPEN_ITEMS = [
  `Confirm the legal name and address of the entity that owns this website. The draft uses ${site.name}, ${site.address.line1}, ${site.address.line2}.`,
  'Name the actual processor behind course payments and state whether a refund window applies.',
  'Name every service that receives visitor data (hosting, email, analytics, the community platform, the video host) and say where each stores data.',
  'Say whether a cookie consent banner will be shown, and whether analytics runs on aggregated or identifiable data.',
  'Choose the response interval for access requests. The draft proposes 30 days.',
  'Decide who the privacy contact is, and whether it is a role or a named person.',
  'Confirm the province that visitors are contracting under, and whether disputes go to the courts or to arbitration.',
  'Have counsel read both documents end to end before either page is linked publicly.',
];

const contact = [
  `By email: ${site.email}`,
  `By post: ${site.name}, ${site.address.line1}, ${site.address.line2}, Canada`,
  `Through the contact form on this website, or by calling ${site.phone}.`,
];

export const privacy = {
  crumb: 'Privacy Policy',
  eyebrow: 'Legal',
  title: 'Privacy Policy',
  accent: '',
  sub: `How ${site.name} collects, uses, keeps and protects the information you share with us.`,
  updated: 'Draft prepared 14 October 2026. Not yet adopted.',
  sections: [
    {
      h: '1. Who is responsible for your information',
      p: [
        `${site.name} ("CFT", "we", "us") is the organisation that decides why and how personal information is collected through this website, our courses, our live sessions and our community spaces.`,
        'We are a Canadian organisation based in Calgary, Alberta. This policy is written to the ten fair information principles of the Personal Information Protection and Electronic Documents Act (PIPEDA) and to Alberta’s Personal Information Protection Act (PIPA).',
        'Our privacy contact answers questions, access requests and complaints. Write to us using any of the routes in section 12. CONFIRM: name the person or role who holds this responsibility.',
      ],
    },
    {
      h: '2. What we mean by personal information',
      p: [
        'Personal information is any information about an identifiable individual. It includes your name, email address, phone number, mailing address, payment records, account credentials, the messages you send us, the courses you enrol in, and the technical data your device sends us, such as your IP address, browser type and pages viewed.',
        'It also includes anything you choose to share about yourself in a testimonial, a workbook, a live session or a community post. That material is deeply personal, and we treat it as sensitive.',
      ],
    },
    {
      h: '3. Consent',
      p: [
        'We collect personal information only with your knowledge and consent, except where the law allows or requires otherwise.',
        'Consent can be express, such as when you create an account, enrol in a course or tick a box to receive our emails. It can also be implied, such as when you use a feature that cannot work without us processing the details you gave us.',
        'Where the information is sensitive, or the use is not what you would reasonably expect, we ask for express consent instead of relying on implication.',
        'You may withdraw consent at any time, subject to legal or contractual notice and the consequences described in section 11. Withdrawing consent does not undo processing that already happened lawfully.',
      ],
    },
    {
      h: '4. What we collect, and why',
      list: [
        'Account details, name, email, password, and any profile information you add, so you can sign in and keep your progress across visits.',
        'Enrolment and payment records, what you bought, when, and the amount, so we can grant access and keep accurate books.',
        'Learning data, which lessons you opened, how far you progressed, and what you submitted, so a course can resume where you stopped and we can see where people get stuck.',
        'Correspondence, the messages you send through the contact form and the email between us, so we can answer you.',
        'Content you contribute, testimonials, comments, questions and reflections you submit or post in our community.',
        'Technical data, IP address, device and browser details, referring page and cookies, so the site loads correctly, stays secure and can be measured.',
        'Session attendance, whether you joined a live class and what you asked, so we can run the session and follow up.',
      ],
    },
    {
      h: '5. How we collect it',
      p: [
        'Directly from you, when you create an account, enrol, fill in a form, email us, attend a session or post in the community.',
        'Automatically, through cookies and similar technology while you use the site.',
        'From third parties, in narrow cases, such as a payment processor confirming a transaction, or a community platform where you joined us there rather than here.',
      ],
    },
    {
      h: '6. Cookies and similar technology',
      p: [
        'We use cookies that keep you signed in, remember your preferences, protect the site against abuse, and help us understand which pages are read.',
        'Strictly necessary cookies cannot be switched off because the site will not function without them. Analytics and preference cookies are optional. CONFIRM: whether a cookie consent banner is shown on first visit and which optional categories it offers.',
        'You can block or delete cookies in your browser settings. Doing so may sign you out, break enrolment, or stop some pages from loading.',
      ],
    },
    {
      h: '7. When we share information',
      p: [
        'We do not sell your personal information, and we do not rent it or trade it for marketing lists. We disclose it only in the situations below.',
      ],
      list: [
        'Service providers, companies that host the site, deliver email, process payments, store video, or run our community space. They act on our instructions, receive only what they need, and are contracted not to use your information for themselves.',
        'Within our own organisation, so the people who teach, support students and keep records can do their work.',
        'With your consent, for example when you agree to publish a testimonial under your name.',
        'Where the law requires it, in response to a valid request from a court, regulator or law enforcement, or to protect our rights, your safety or the safety of others.',
        'In a business transfer, if CFT is reorganised or the assets are sold, student records may move with them. We would tell you first.',
      ],
    },
    {
      h: '8. Where information is stored',
      p: [
        'Our own records are kept in Canada. Some of the services we use operate servers outside Canada, including in the United States, which means your information may be handled there and may be reachable by foreign authorities under their laws.',
        'If you ask, we will tell you which of our providers store data outside Canada and under what safeguards. CONFIRM: the actual storage location for each provider.',
      ],
    },
    {
      h: '9. How long we keep it',
      p: [
        'We keep personal information only as long as we need it for the purposes above, and then delete or anonymise it.',
        'Account and enrolment records stay active while your account is open. Financial records are kept for as long as Canadian tax law requires. Messages and correspondence are kept for a reasonable period after a conversation ends so we have context if you write again.',
        'If you close your account we remove your personal information from active systems and keep only what the law obliges us to keep, in a restricted archive.',
      ],
    },
    {
      h: '10. How we protect it',
      p: [
        'No system is perfectly secure, and we will not claim otherwise. What we do is proportionate to how sensitive the information is.',
        'Passwords are stored in a form that cannot be read back. Access to the site over the internet is encrypted. Only the people who need personal information for their role can reach it. We review who has access when roles change.',
        'Course video is streamed rather than offered as a download, and access to a lesson is checked against your enrolment before it plays.',
        'If a breach creates a real risk of serious harm to you, we will notify you and the Office of the Privacy Commissioner as the law requires, and tell you what we are doing about it.',
      ],
    },
    {
      h: '11. Your rights',
      p: [
        'You can ask us, at any time and without charge for the ordinary request:',
      ],
      list: [
        'Whether we hold personal information about you, and access to it in a readable form.',
        'That we correct information that is inaccurate or incomplete.',
        'That we delete information we no longer need, where that is consistent with our obligations to you.',
        'That we stop using your information, by withdrawing consent.',
        'A portable copy of what you gave us, where the technology allows it.',
        'An explanation of how we handle your information, which is what this policy is for.',
      ],
      p2: [
        'Ask using any route in section 12. We verify that you are you before releasing anything. We respond within 30 days. CONFIRM: the response interval you can actually meet.',
        'A few limited exceptions apply under PIPEDA and PIPA, for example where disclosure would reveal another person’s information, where it is commercially protected, or where it affects a legal matter. When we refuse a request we tell you why and tell you that you may complain.',
      ],
    },
    {
      h: '12. Children',
      p: [
        'This site and our programs are written for adults. We do not knowingly collect personal information from a child under the age at which consent can be given on their own behalf, which in Alberta is 18 unless a parent or guardian acts for the child.',
        'If you believe a child has given us personal information, contact us and we will investigate and remove it.',
      ],
    },
    {
      h: '13. Contact and complaints',
      p: [
        'Questions, requests and complaints about privacy reach us:',
      ],
      list: contact,
      p2: [
        'Start with us. We would rather answer your question than receive a complaint.',
        'If you are not satisfied with our response, you may complain to the Privacy Commissioner of Canada, at https://www.priv.gc.ca, or to the Office of the Information and Privacy Commissioner of Alberta, at https://www.oipc.ab.ca.',
      ],
    },
    {
      h: '14. Changes to this policy',
      p: [
        'We update this policy when our practices change. The date at the top of the page shows the current version. Where a change matters, we will tell you on the site or by email before it takes effect rather than relying on you to notice.',
      ],
    },
  ],
};

export const terms = {
  crumb: 'Terms of Service',
  eyebrow: 'Legal',
  title: 'Terms of Service',
  accent: '',
  sub: `The agreement between you and ${site.name} when you use this website, our courses, our books and our live sessions.`,
  updated: 'Draft prepared 14 October 2026. Not yet adopted.',
  sections: [
    {
      h: '1. Agreement',
      p: [
        'These Terms of Service form a contract between you and ' + site.name + ' ("CFT", "we", "us"). By creating an account, buying a program, or using this website, you accept them.',
        'Read them. They cover payment, refunds, what you may do with course material, and the limits of what we can promise.',
        'If you do not accept them, please do not create an account or enrol. You can still read the free pages of the site.',
      ],
    },
    {
      h: '2. Who may use the services',
      p: [
        'You must be at least the age of majority in your province or state, and able to form a binding contract.',
        'You must give accurate information when you register. If you are enrolling on behalf of someone else, you must have their authority to do so.',
      ],
    },
    {
      h: '3. What we provide',
      p: [
        'CFT teaches practical inner work: self-awareness, presence, emotional balance, relationships, meaning and purpose. We deliver it through recorded courses, live classes, books, guided practices and community spaces.',
        'What we provide is education and personal development. It is not medical care, mental health treatment, psychotherapy, counselling, legal advice, financial advice or any other professional service.',
        'If you are in crisis or thinking about harming yourself, stop here and contact your local emergency number or a crisis line. In Canada you can reach Talk Suicide Canada at 1-833-456-4566. CONFIRM: the crisis resources you want to point to.',
      ],
    },
    {
      h: '4. Accounts',
      p: [
        'You are responsible for keeping your login details private and for everything done under your account. Tell us promptly if you think someone else has reached it.',
        'We may suspend an account that is being misused, that threatens other members, or that breaches these terms.',
        'You may close your account at any time. Closing it removes access to the material, and we then handle your data as the Privacy Policy describes.',
      ],
    },
    {
      h: '5. Enrolment, price and payment',
      p: [
        'Prices are listed in the currency shown next to each program. Taxes, if any, are added at checkout according to where you are billed. CONFIRM: GST and provincial treatment for your sales.',
        'Payment is taken by a third-party processor. We do not see or keep your full card number.',
        'Enrolment is confirmed when payment clears. Buying a program does not transfer any ownership of it; see section 7.',
        'Live sessions happen on the published schedule. Missing one does not entitle you to a refund, but recordings, where they exist, stay available to you.',
      ],
    },
    {
      h: '6. Refunds',
      p: [
        'Our refund practice is: CONFIRM. State the window, whether digital courses are exempt once opened, how a request is made, and how long a refund takes to appear.',
        'Until that clause is agreed and published, treat our refund terms as undefined and contact us at ' + site.email + ' before buying if this matters to you.',
      ],
    },
    {
      h: '7. Your licence to the material',
      p: [
        'Everything on this site, including lesson video, audio, workbooks, text, names, logos and the course structure, belongs to CFT or to its licensors and is protected by copyright and trade mark law.',
        'Enrolling grants you a personal, non-exclusive, non-transferable, revocable licence to use the material for your own learning, for as long as your access lasts.',
        'You may not copy, record, redistribute, resell, publish, translate into a competing product, share your login, screen-record, download where downloading is disabled, or show the material to anyone other than yourself.',
        'Streaming video is watermarked to the account that plays it. That is a deterrent, not a punishment, and it exists so the work can stay available to people who pay for it.',
        'Your own reflections, journal entries and what you say about your experience remain yours. We claim no ownership of them.',
      ],
    },
    {
      h: '8. Acceptable use',
      p: [
        'You agree not to use the site or the programs to attack it technically, to scrape it, to interfere with other members’ access, to reverse engineer it, to probe for vulnerabilities without our written permission, or to upload anything unlawful, malicious or harassing.',
        'Automated access beyond ordinary browsing, including robots and crawlers, needs our written consent.',
      ],
    },
    {
      h: '9. Community conduct',
      p: [
        'Our classes and community spaces ask for the same thing the practice does: honesty without cruelty, and privacy for other people’s stories.',
        'What another member shares stays in the room. Do not repeat, screenshot or publish it elsewhere.',
        'We may remove content and end access for behaviour that makes others unsafe, that is discriminatory or abusive, or that repeatedly ignores a request from a facilitator.',
      ],
    },
    {
      h: '10. No guarantee of outcome',
      p: [
        'Inner work depends on what you bring and what you do with it. We commit to teaching it carefully and honestly. We cannot commit to a particular result for you, and no part of these terms promises one.',
        'Testimonials describe what one person experienced. They are not a prediction about you.',
        'You remain responsible for your own decisions. If a practice feels like too much, slow down, stop, and speak to a qualified professional.',
      ],
    },
    {
      h: '11. Third parties and links',
      p: [
        'The site links to payment processors, video hosts, our community platform, social accounts and other websites. They are not ours, and these terms do not govern them.',
        'Their own terms and privacy policies apply the moment you leave us. We are not responsible for what they do with your information or their content.',
      ],
    },
    {
      h: '12. Changes to the service',
      p: [
        'We can add, move or retire courses, lessons and features. If we retire something you paid for and cannot replace it, we will offer a refund of a reasonable portion of the price.',
        'We aim to keep the site available, but we do not promise uninterrupted or error-free operation, and we may take it down for maintenance or for reasons outside our control.',
      ],
    },
    {
      h: '13. Liability',
      p: [
        'To the extent the law allows, CFT is not liable for indirect, incidental, special or consequential loss arising from your use of the site or the programs.',
        'Where the law lets us cap liability for direct loss, the cap is the amount you paid us for the part of the service that caused the loss in the twelve months before the claim.',
        'Nothing here excludes liability that cannot be excluded, including for fraud, gross negligence, or wilful misconduct.',
      ],
    },
    {
      h: '14. Indemnity',
      p: [
        'If you breach these terms, or your use of the service causes a claim against CFT, you agree to cover our reasonable costs and losses arising from that claim, to the extent the law allows.',
      ],
    },
    {
      h: '15. Governing law and disputes',
      p: [
        'These terms are governed by the laws of Alberta and the laws of Canada that apply in Alberta. CONFIRM: the governing province if you sell mainly elsewhere.',
        'The courts of Alberta have jurisdiction over disputes. Tell us first, in writing, and we will try to resolve it before anyone files anything.',
        'Consumer protection statutes may give you additional rights that these terms cannot take away, including in the country or province where you live.',
      ],
    },
    {
      h: '16. General',
      p: [
        'If one clause is unenforceable, the rest of the agreement stands.',
        'If we do not enforce a clause once, that does not mean we have given it up.',
        'You may not assign this agreement. We may, in a reorganisation or sale, as the Privacy Policy describes.',
        'These terms, together with the Privacy Policy, are the whole agreement between us about the services. Where they conflict on your personal information, the Privacy Policy governs that subject.',
      ],
    },
    {
      h: '17. Contact',
      p: ['Questions about these terms reach us:', ...contact],
    },
    {
      h: '18. Changes to these terms',
      p: [
        'We may update these terms. The date at the top of the page shows the current version. We will give notice on the site, and by email to enrolled students, before a material change takes effect.',
        'Continuing to use the services after a change takes effect means you accept the updated terms. If you do not, stop using the services and ask us to close your account.',
      ],
    },
  ],
};

export const legalDocuments = { privacy, terms };
