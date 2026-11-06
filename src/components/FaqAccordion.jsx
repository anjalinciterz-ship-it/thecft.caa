import { useState } from 'react';
import { Icon } from './icons';

/* One glyph per FAQ category, shared by the FAQ page and the home preview. */
export const faqCategoryIcon = {
  cft: 'lotus',
  zalah: 'seeker',
  spirituality: 'sun',
  mental: 'heart',
  courses: 'book',
  community: 'users',
  practical: 'sprout',
};

/* Semantic button trigger inside a heading; the panel is a labelled region. */
export default function FaqAccordion({ id, question, answer, icon, level = 3, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const buttonId = `${id}-trigger`;
  const panelId = `${id}-panel`;
  const Heading = `h${level}`;

  return (
    <div className={`faq-item${open ? ' open' : ''}`}>
      <Heading className="faq-item-head">
        <button
          type="button"
          id={buttonId}
          className="faq-btn"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          {icon && (
            <span className="faq-ico" aria-hidden="true">
              <span className="gdot" />
            </span>
          )}
          <span className="faq-q">{question}</span>
          <span className="faq-chev" aria-hidden="true">
            <Icon name="chevron" size={16} />
          </span>
        </button>
      </Heading>
      <div className="faq-panel" id={panelId} role="region" aria-labelledby={buttonId}>
        <div className="faq-panel-in">
          <div className="faq-a">
            {answer.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
