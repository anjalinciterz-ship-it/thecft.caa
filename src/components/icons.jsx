const paths = {
  leaf: (
    <>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="17" rx="3" />
      <path d="M8 2.2v4M16 2.2v4M3 10h18" />
      <circle cx="8" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  lotus: (
    <>
      <path d="M12 20.5c-4.6 0-8.3-2.9-8.3-6.8 2.1 0 3.9.7 5.3 2" />
      <path d="M12 20.5c4.6 0 8.3-2.9 8.3-6.8-2.1 0-3.9.7-5.3 2" />
      <path d="M12 20.5c2.5-1.8 3.8-4.4 3.8-7.7 0-2.8-1.3-5.4-3.8-7.8-2.5 2.4-3.8 5-3.8 7.8 0 3.3 1.3 5.9 3.8 7.7Z" />
    </>
  ),
  seeker: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5v-.8A7.5 7.5 0 0 1 12 12.2a7.5 7.5 0 0 1 7.5 7.5v.8" />
    </>
  ),
  eye: (
    <>
      <path d="M2.4 12S6 5.9 12 5.9 21.6 12 21.6 12 18 18.1 12 18.1 2.4 12 2.4 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m4 4 16 16" />
      <path d="M10.7 6.1A9.7 9.7 0 0 1 12 6c6 0 9.6 6 9.6 6a17.8 17.8 0 0 1-3.1 3.8" />
      <path d="M6.6 6.7A17.3 17.3 0 0 0 2.4 12S6 18.1 12 18.1a9.6 9.6 0 0 0 3.4-.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 11v5.2" />
      <circle cx="12" cy="7.8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2.8M12 18.7v2.8M2.5 12h2.8M18.7 12h2.8M5.2 5.2l2 2M16.8 16.8l2 2M18.8 5.2l-2 2M7.2 16.8l-2 2" />
    </>
  ),
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  heart: (
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.51 4.04 3 5.5l7 7Z" />
  ),
  chevron: <path d="m6 9.5 6 6 6-6" />,
  mail: (
    <>
      <rect x="2.5" y="4.6" width="19" height="14.8" rx="3" />
      <path d="m3.2 7.4 8.8 5.9 8.8-5.9" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.4s7-5.5 7-10.9a7 7 0 1 0-14 0c0 5.4 7 10.9 7 10.9Z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M12 6.9V12l3.6 2.2" />
    </>
  ),
  chat: (
    <path d="M20.5 11.6a8.4 8.4 0 0 1-8.5 8.3c-1 .1-2-.1-2.9-.4L4 21l1.6-4.1a8.1 8.1 0 0 1-1.6-4.9A8.4 8.4 0 0 1 12 3.3a8.4 8.4 0 0 1 8.5 8.3Z" />
  ),
  pencil: (
    <>
      <path d="M16.6 3.9a2.5 2.5 0 0 1 3.5 3.5L8.1 19.4l-4.6 1.1 1.1-4.6Z" />
      <path d="m14.5 6 3.5 3.5" />
    </>
  ),
  bulb: (
    <>
      <path d="M9.4 17.6h5.2M10 20.6h4" />
      <path d="M12 2.8a6.4 6.4 0 0 0-3.7 11.6c.6.5.9 1.1.9 1.8h5.6c0-.7.3-1.3.9-1.8A6.4 6.4 0 0 0 12 2.8Z" />
      <path d="M12 8.6v3.4" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 20.5v-8" />
      <path d="M12 12.5C12 8.6 9.1 6 5.2 6c0 3.9 2.9 6.5 6.8 6.5Z" />
      <path d="M12 12.5c0-3.1 2.2-5.3 5.6-5.3 0 3.1-2.2 5.3-5.6 5.3Z" />
      <path d="M7.5 20.5h9" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 15.5v-3.2a8 8 0 0 1 16 0v3.2" />
      <rect x="2.6" y="14" width="4.4" height="7" rx="2.2" />
      <rect x="17" y="14" width="4.4" height="7" rx="2.2" />
    </>
  ),
  book: (
    <>
      <path d="M12 6.6C10.5 5.3 8.4 4.7 5.6 4.7c-1 0-1.9.1-2.7.3v13.2c.8-.2 1.7-.3 2.7-.3 2.8 0 4.9.6 6.4 1.9 1.5-1.3 3.6-1.9 6.4-1.9 1 0 1.9.1 2.7.3V5c-.8-.2-1.7-.3-2.7-.3-2.8 0-4.9.6-6.4 1.9Z" />
      <path d="M12 6.6v13.2" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2.8" width="6" height="11.4" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3.2M8.5 21.2h7" />
    </>
  ),
  play: <path d="M8.5 5.6 18.8 12 8.5 18.4Z" />,
  pause: <path d="M9.5 5.2v13.6M14.5 5.2v13.6" />,
  film: (
    <>
      <rect x="3" y="4.6" width="18" height="14.8" rx="3" />
      <path d="M3 9.6h18M3 14.4h18M8.2 4.6v14.8M15.8 4.6v14.8" />
    </>
  ),
  lock: (
    <>
      <rect x="4.4" y="10.4" width="15.2" height="10.6" rx="2.8" />
      <path d="M8 10.4V7.8a4 4 0 0 1 8 0v2.6" />
      <circle cx="12" cy="15.4" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  link: (
    <>
      <path d="M10.2 13.3a4.4 4.4 0 0 0 6.4.4l2.5-2.5a4.4 4.4 0 0 0-6.2-6.2l-1.4 1.4" />
      <path d="M13.8 10.7a4.4 4.4 0 0 0-6.4-.4l-2.5 2.5a4.4 4.4 0 0 0 6.2 6.2l1.4-1.4" />
    </>
  ),
  gift: (
    <>
      <rect x="3.4" y="9" width="17.2" height="12" rx="2.4" />
      <path d="M3.4 13.6h17.2M12 9v12" />
      <path d="M12 9C10.6 9 7.6 8.6 7.6 6.3A2.3 2.3 0 0 1 12 5.1a2.3 2.3 0 0 1 4.4 1.2C16.4 8.6 13.4 9 12 9Z" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.6" />
      <path d="m15.6 15.6 4.4 4.4" />
    </>
  ),
  menu: <path d="M3.6 7h16.8M3.6 12h16.8M3.6 17h16.8" />,
  /* Simplified monochrome platform marks, drawn to the same 24px grid as the rest of
     the set — swap in each brand's official vector once the files are supplied. */
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="12" r="4.3" />
      <circle cx="17.1" cy="6.9" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: (
    <path
      fill="currentColor"
      stroke="none"
      d="M13.9 21.6v-8.4h2.8l.5-3.3h-3.3V7.7c0-1 .3-1.7 1.8-1.7h1.6V2.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.8H7.7v3.3h2.9v8.4Z"
    />
  ),
  tiktok: (
    <>
      <circle cx="9.8" cy="16" r="3.6" />
      <path d="M13.4 16V3.2c1.7 2.7 3.6 3.8 6.5 4.2" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.3" y="5.2" width="19.4" height="13.6" rx="4.4" />
      <path d="M10.1 8.9 15.5 12l-5.4 3.1Z" fill="currentColor" stroke="none" />
    </>
  ),
  linkedin: (
    <path
      fill="currentColor"
      stroke="none"
      d="M4.7 3a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2ZM2.9 9.1h3.7V21H2.9Zm6.2 0h3.5v1.6h.1c.5-.9 1.8-1.9 3.6-1.9 3.9 0 4.6 2.5 4.6 5.8V21h-3.7v-5.7c0-1.4 0-3.1-1.9-3.1s-2.2 1.5-2.2 3V21H9.1Z"
    />
  ),
};

export function Icon({ name, size = 24, className, style }) {
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
