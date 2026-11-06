export default function CourseBanner({ course, loading = 'lazy', className = '' }) {
  const src = course.banner || course.image;
  if (!src) {
    /* A newly published offering may not have artwork yet; the layout must hold
       instead of showing a broken image on the public site. */
    return <div className={`cq-art cq-art-ph${className ? ' ' + className : ''}`} role="img" aria-label={`${course.name}, artwork to be added`} />;
  }
  return (
    <img
      className={`cq-art${className ? ' ' + className : ''}`}
      src={src}
      alt={`${course.name}, official program banner`}
      width={course.bannerW}
      height={course.bannerH}
      loading={loading}
    />
  );
}
