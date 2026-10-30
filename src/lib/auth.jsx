import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, apiRequest, invalidateCsrfToken } from './api';

const AuthContext = createContext(null);

function sessionUser(user) {
  if (!user || typeof user !== 'object') return null;
  return {
    ...user,
    name: user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Member',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [authConfig, setAuthConfig] = useState(null);
  const [authConfigLoading, setAuthConfigLoading] = useState(true);
  const [authConfigError, setAuthConfigError] = useState(null);
  const mounted = useRef(false);
  const currentUser = useRef(null);
  const sessionRequest = useRef(null);
  const enrollmentRequest = useRef(null);
  const mutationPending = useRef(false);

  const updateUser = useCallback((nextUser) => {
    enrollmentRequest.current?.abort();
    currentUser.current = sessionUser(nextUser);
    setUser(currentUser.current);
    setEnrollments([]);
  }, []);

  const refreshEnrollments = useCallback(async () => {
    enrollmentRequest.current?.abort();
    if (!mounted.current || !currentUser.current) {
      if (mounted.current) setEnrollments([]);
      return [];
    }
    const controller = new AbortController();
    const owner = currentUser.current;
    enrollmentRequest.current = controller;
    const isCurrent = () => mounted.current && !controller.signal.aborted && currentUser.current === owner;
    try {
      const data = await apiRequest('/student/courses?limit=60', { signal: controller.signal });
      const courses = Array.isArray(data) ? data : data?.enrollments ?? data?.courses ?? data?.items;
      if (!Array.isArray(courses)) {
        throw new ApiError('INVALID_RESPONSE', 200, 'Your course enrollments could not be loaded.');
      }
      if (isCurrent()) {
        setEnrollments(courses);
        setAuthError(null);
      }
      return courses;
    } catch (error) {
      if (isCurrent()) {
        setEnrollments([]);
        setAuthError(error);
        if (error.status === 401) updateUser(null);
      }
      throw error;
    } finally {
      if (enrollmentRequest.current === controller) enrollmentRequest.current = null;
    }
  }, [updateUser]);

  const refreshSession = useCallback(async () => {
    if (mutationPending.current) {
      throw new ApiError('AUTH_IN_PROGRESS', 0, 'Please wait for the current sign-in request to finish.');
    }
    sessionRequest.current?.abort();
    const controller = new AbortController();
    sessionRequest.current = controller;
    const isCurrent = () => mounted.current && !controller.signal.aborted;
    if (mounted.current) {
      setLoading(true);
      setAuthError(null);
    }
    try {
      const data = await apiRequest('/auth/me', { signal: controller.signal });
      if (!isCurrent()) return null;
      updateUser(data?.authenticated === true ? data.user : null);
      // Enrollment failures must not turn an otherwise valid sign-in into a fake failure.
      if (currentUser.current) await refreshEnrollments().catch(() => {});
      return currentUser.current;
    } catch (error) {
      if (isCurrent()) {
        updateUser(null);
        setAuthError(error.status === 401 ? null : error);
      }
      if (error.status === 401) return null;
      throw error;
    } finally {
      if (sessionRequest.current === controller) {
        sessionRequest.current = null;
        if (isCurrent()) setLoading(false);
      }
    }
  }, [refreshEnrollments, updateUser]);

  const authenticate = useCallback(async (path, body) => {
    if (mutationPending.current) {
      throw new ApiError('AUTH_IN_PROGRESS', 0, 'Please wait for the current authentication request to finish.');
    }
    mutationPending.current = true;
    sessionRequest.current?.abort();
    enrollmentRequest.current?.abort();
    const controller = new AbortController();
    sessionRequest.current = controller;
    const isCurrent = () => mounted.current && !controller.signal.aborted;
    if (mounted.current) {
      setLoading(true);
      setAuthError(null);
    }
    try {
      const data = await apiRequest(path, { method: 'POST', body, signal: controller.signal });
      if (!isCurrent()) throw new ApiError('ABORTED', 0, 'The request was cancelled.');
      if (path === '/auth/logout') {
        updateUser(null);
      } else {
        if (!data?.user || typeof data.user !== 'object') {
          throw new ApiError('INVALID_RESPONSE', 200, 'The server did not return an authenticated account.');
        }
        invalidateCsrfToken();
        updateUser(data.user);
        await refreshEnrollments().catch(() => {});
      }
      return data;
    } catch (error) {
      if (isCurrent()) setAuthError(error);
      throw error;
    } finally {
      mutationPending.current = false;
      if (sessionRequest.current === controller) {
        sessionRequest.current = null;
        if (isCurrent()) setLoading(false);
      }
    }
  }, [refreshEnrollments, updateUser]);

  const login = useCallback((identifier, password) => authenticate('/auth/login', { identifier, password }), [authenticate]);
  const verifyOtp = useCallback((challengeId, code) => authenticate('/auth/otp/verify', { challengeId, code }), [authenticate]);
  const googleLogin = useCallback((credential) => {
    if (typeof credential !== 'string' || !credential) {
      return Promise.reject(new ApiError('GOOGLE_CREDENTIAL_MISSING', 0, 'Google did not return a sign-in credential. Please try again.'));
    }
    return authenticate('/auth/google', { credential });
  }, [authenticate]);
  const logout = useCallback(() => authenticate('/auth/logout'), [authenticate]);

  useEffect(() => {
    mounted.current = true;
    refreshSession().catch(() => {});
    return () => {
      mounted.current = false;
      sessionRequest.current?.abort();
      enrollmentRequest.current?.abort();
    };
  }, [refreshSession]);

  useEffect(() => {
    const controller = new AbortController();
    setAuthConfigLoading(true);
    setAuthConfigError(null);
    apiRequest('/auth/status', { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setAuthConfig(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setAuthConfigError(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAuthConfigLoading(false);
      });
    return () => controller.abort();
  }, []);

  const owns = useCallback((courseId) => {
    if (!user || courseId == null) return false;
    return enrollments.some((entry) => {
      if (!entry || (entry.accessActive ?? entry.enrollment?.accessActive) !== true) return false;
      const course = entry.course && typeof entry.course === 'object' ? entry.course : entry;
      const identifiers = [course.id, course.legacyId, course.slug, entry.courseId,
        typeof entry.course === 'string' ? entry.course : null];
      return identifiers.some((id) => id != null && String(id) === String(courseId));
    });
  }, [user, enrollments]);

  const value = useMemo(() => ({
    user, isAuthed: !!user, loading, authError, login, verifyOtp, googleLogin, logout,
    refreshSession, refreshEnrollments, enrollments, owns,
    authConfig, authConfigLoading, authConfigError,
  }), [user, loading, authError, login, verifyOtp, googleLogin, logout, refreshSession,
    refreshEnrollments, enrollments, owns, authConfig, authConfigLoading, authConfigError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function initials(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
