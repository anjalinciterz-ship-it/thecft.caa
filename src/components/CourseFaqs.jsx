import { useState } from 'react';
import { Icon } from './icons';

export default function CourseFaqs({ faqs }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="cq-faqs">
      {faqs.map((f, i) => {
        const on = open === i;
        return (
          <div key={f.q} className={`cq-faq${on ? ' is-open' : ''}`}>
            <h3>
              <button
                type="button"
                className="cq-faq-btn"
                aria-expanded={on}
                onClick={() => setOpen(on ? -1 : i)}
              >
                <span>{f.q}</span>
                <Icon name="chevron" size={16} className="cq-faq-ico" />
              </button>
            </h3>
            <p className="cq-faq-a" hidden={!on}>
              {f.a}
            </p>
          </div>
        );
      })}
    </div>
  );
}
