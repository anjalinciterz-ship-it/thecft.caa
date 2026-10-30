import { Link } from 'react-router-dom';

const INLINE = String.raw`\*\*([\s\S]+?)\*\*|\*([\s\S]+?)\*|\[([^\]]+)\]\(([^)]+)\)`;

function Linkish({ href, children }) {
  if (href.startsWith('/')) return <Link to={href}>{children}</Link>;
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function inline(text) {
  const nodes = [];
  const re = new RegExp(INLINE, 'g');
  let last = 0;
  let key = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) nodes.push(<strong key={key++}>{inline(m[1])}</strong>);
    else if (m[2] !== undefined) nodes.push(<em key={key++}>{inline(m[2])}</em>);
    else nodes.push(<Linkish key={key++} href={m[4]}>{inline(m[3])}</Linkish>);
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const lines = (chunk) => chunk.split('\n').map((l) => l.trim()).filter(Boolean);

export default function Markdown({ source }) {
  return (
    <>
      {source
        .split(/\n{2,}/)
        .map((c) => c.trim())
        .filter(Boolean)
        .map((chunk, i) => {
          const ls = lines(chunk);
          if (chunk === '---') return <hr key={i} />;
          if (chunk.startsWith('### ')) return <h3 key={i}>{inline(ls[0].slice(4))}</h3>;
          if (chunk.startsWith('## ')) return <h2 key={i}>{inline(ls[0].slice(3))}</h2>;
          if (ls.every((l) => l.startsWith('- ')))
            return (
              <ul key={i}>
                {ls.map((l, j) => (
                  <li key={j}>{inline(l.slice(2))}</li>
                ))}
              </ul>
            );
          if (ls.every((l) => /^\d+[.)]\s/.test(l)))
            return (
              <ol key={i}>
                {ls.map((l, j) => (
                  <li key={j}>{inline(l.replace(/^\d+[.)]\s/, ''))}</li>
                ))}
              </ol>
            );
          return <p key={i}>{inline(ls.join(' '))}</p>;
        })}
    </>
  );
}
