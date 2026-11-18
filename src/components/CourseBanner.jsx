export default function CourseBanner({ course, src, loading = 'lazy', className = '' }) {
  const url = src || course.banner || course.image;
  if (!url) {
    /* A newly published offering may not have artwork yet; the layout must hold
       instead of showing a broken image on the public site. */
    return <div className={`cq-art cq-art-ph${className ? ' ' + className : ''}`} role="img" aria-label={`${course.name}, artwork to be added`} />;
  }
  // The page artwork is a different file from the listing banner, so it gets its
  // own size attributes; the listing numbers would reserve a box ~2% too tall
  // and the image shifts it on decode.
  const w = src ? course.pageBannerW : course.bannerW;
  const h = src ? course.pageBannerH : course.bannerH;
  return (
    <img
      className={`cq-art${className ? ' ' + className : ''}`}
      src={url}
      alt={`${course.name}, official program banner`}
      width={w}
      height={h}
      loading={loading}
    />
  );
}
