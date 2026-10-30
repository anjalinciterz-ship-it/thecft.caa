import { Fragment, useMemo } from 'react';

/*
 * Same call shape as motion-primitives' <TextEffect> (per / preset / delay),
 * built on a CSS stagger so the hero ships without an animation library.
 * Their `variants` example maps to preset="spring" (+ randomColor for the
 * per-word colour pick); staggerChildren maps to `step`.
 */

const STEP = { char: 0.028, word: 0.055 };

const randHex = () =>
  `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')}`;

const groupWords = (text, per) =>
  text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ({ chars: per === 'char' ? Array.from(word) : [word] }));

export function TextEffect({
  children,
  as: Tag = 'span',
  per = 'word',
  preset = 'fade',
  delay = 0,
  step,
  intensity = 1,
  randomColor = false,
  className = '',
  ...rest
}) {
  const text = String(children ?? '');
  const groups = useMemo(() => groupWords(text, per), [text, per]);
  const seeds = useMemo(
    () =>
      groups.map((g) =>
        g.chars.map(() => ({
          y: (Math.random() * 100 - 50) * intensity,
          r: (Math.random() * 90 - 45) * intensity,
          c: randHex(),
        }))
      ),
    [groups, intensity]
  );

  const gap = step ?? STEP[per];
  let n = -1;

  return (
    <Tag
      className={`te te--${per} te--${preset}${randomColor ? ' te--color' : ''}${className ? ` ${className}` : ''}`}
      {...rest}
    >
      <span className="sr-only">{text}</span>
      <span className="te-run" aria-hidden="true">
        {groups.map((g, gi) => (
          <Fragment key={gi}>
            {gi > 0 ? ' ' : null}
            <span className="te-w">
              {g.chars.map((ch, ci) => {
                n += 1;
                const s = seeds[gi][ci];
                return (
                  <span
                    key={ci}
                    className="te-t"
                    style={{
                      '--te-d': `${(delay + n * gap).toFixed(3)}s`,
                      '--te-y': `${s.y.toFixed(1)}px`,
                      '--te-r': `${s.r.toFixed(1)}deg`,
                      '--te-c': s.c,
                    }}
                  >
                    {ch}
                  </span>
                );
              })}
            </span>
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
