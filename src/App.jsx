import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

/* Every route but the landing page is its own chunk, so a first visit to / pulls
   only what Home actually renders. Home stays eager because it is the LCP, and
   NotFound stays eager because it is the fallback for a URL that has no chunk of
   its own, and a 404 should not wait on a network round trip. */
const About = lazy(() => import('./pages/About'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Books = lazy(() => import('./pages/Books'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));
const Testimonials = lazy(() => import('./pages/Testimonials'));
const Connect = lazy(() => import('./pages/Connect'));
const WisdomCall = lazy(() => import('./pages/WisdomCall'));
const Faq = lazy(() => import('./pages/Faq'));
const Login = lazy(() => import('./pages/Login'));
const MagicLink = lazy(() => import('./pages/MagicLink'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Journey = lazy(() => import('./pages/Journey'));
const Legal = lazy(() => import('./pages/Legal'));
const Admin = lazy(() => import('./pages/Admin'));
const CMSPage = lazy(() => import('./pages/CMSPage'));

/* The boundary holds the shape of a page while its chunk arrives, using the same
   skeleton bars the library already shows while a list loads, so the swap does
   not shove the layout. */
function RoutePending() {
  return (
    <div className="route-pending sk-stack" role="status">
      <span className="sr-only">Loading this page…</span>
      <span className="sk" />
      <span className="sk" />
      <span className="sk" />
    </div>
  );
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  const { pathname } = useLocation();
  const authPages = new Set(['/login', '/signup', '/forgot-password', '/reset-password', '/magic-link']);
  const bare = authPages.has(pathname) || pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
  /* The client's readability lift covers every public page. Home is signed off
     exactly as it is, and the member and admin apps have their own type system,
     so those stay out of it. See .type-lift in global.css. */
  const liftType = pathname !== '/' && !pathname.startsWith('/dashboard') && !pathname.startsWith('/admin');
  return (
    <>
      <ScrollToTop />
      {!bare && <Header />}
      <main className={liftType ? 'type-lift' : undefined}>
        <Suspense fallback={<RoutePending />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/course/:id" element={<CourseDetail />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/journey/:slug" element={<Journey />} />
            <Route path="/books" element={<Books />} />
            <Route path="/books/:slug" element={<BookDetail />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/testimonials" element={<Testimonials />} />
            <Route path="/connect" element={<Connect />} />
            <Route path="/wisdom-call" element={<WisdomCall />} />
            <Route path="/faq" element={<Faq />} />
            <Route path="/pages/:slug" element={<Suspense fallback={<p role="status">Loading page…</p>}><CMSPage /></Suspense>} />
            <Route path="/login" element={<Login />} />
            <Route path="/magic-link" element={<MagicLink />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard/*" element={<Dashboard />} />
            <Route path="/admin/*" element={<Suspense fallback={<p role="status">Opening administration…</p>}><Admin /></Suspense>} />
            <Route path="/privacy" element={<Legal doc="privacy" />} />
            <Route path="/terms" element={<Legal doc="terms" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      {!bare && <Footer />}
    </>
  );
}
