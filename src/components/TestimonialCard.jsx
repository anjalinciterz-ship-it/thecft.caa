import {
  MorphingDialog,
  MorphingDialogClose,
  MorphingDialogContainer,
  MorphingDialogContent,
  MorphingDialogDescription,
  MorphingDialogTitle,
  MorphingDialogTrigger,
} from './MorphingDialog';

export default function TestimonialCard({ t }) {
  const all = [t.lead, ...(t.more || [])];

  return (
    <MorphingDialog transition={{ type: 'spring', bounce: 0.05, duration: 0.28 }} maxWidth={720}>
      <MorphingDialogTrigger as="figure" className="t-card" label={`Read ${t.name}'s full testimonial`}>
        <span className="t-mark" aria-hidden="true">
          “
        </span>

        <blockquote className="t-body">
          <p>{t.lead}</p>
        </blockquote>

        <figcaption className="t-foot">
          <span className="t-name">{t.name}</span>
          <span className="t-cta" aria-hidden="true">
            Read full story →
          </span>
        </figcaption>
      </MorphingDialogTrigger>

      <MorphingDialogContainer>
        <MorphingDialogContent className="t-dialog" label={`Testimonial from ${t.name}`}>
          <MorphingDialogClose />

          <span className="t-mark" aria-hidden="true">
            “
          </span>

          <MorphingDialogTitle as="h2" className="t-name">
            {t.name}
          </MorphingDialogTitle>

          <MorphingDialogDescription>
            <blockquote className="t-body">
              {all.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </blockquote>
          </MorphingDialogDescription>
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}
