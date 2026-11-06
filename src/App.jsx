import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Checkout from './pages/Checkout';
import Books from './pages/Books';
import BookDetail from './pages/BookDetail';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Testimonials from './pages/Testimonials';
import Connect from './pages/Connect';
import WisdomCall from './pages/WisdomCall';
import Faq from './pages/Faq';
import Login from './pages/Login';
import MagicLink from './pages/MagicLink';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Journey from './pages/Journey';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';

const Admin = lazy(() => import('./pages/Admin'));
const CMSPage = lazy(() => import('./pages/CMSPage'));

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
  return (
    <>
      <ScrollToTop />
      {!bare && <Header />}
      <main>
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
      </main>
      {!bare && <Footer />}
    </>
  );
}
