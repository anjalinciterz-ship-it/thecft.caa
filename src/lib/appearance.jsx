import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from './api';

/**
 * Two brand appearances, both from the locked palette: Cosmic (the plum
 * starfield the site was built in) and Ivory (warm ivory and lavender mist for
 * reading in daylight). Which one a first visitor gets is a site setting; a
 * visitor who chooses remembers, and the choice is theirs alone — it is
 * presentation, never access.
 */

export const APPEARANCES = ['light', 'dark'];
// A site default may also defer to the visitor's device, which is not an
// appearance a visitor can pick for themselves.
const SITE_DEFAULTS = [...APPEARANCES, 'system'];
const STORAGE_KEY = 'cft-appearance';
const AppearanceContext = createContext(null);

function readStored() {
  try {
    return APPEARANCES.includes(localStorage.getItem(STORAGE_KEY)) ? localStorage.getItem(STORAGE_KEY) : null;
  } catch {
    // A blocked storage area only costs the memory of the choice, not the choice.
    return null;
  }
}

function systemAppearance() {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function AppearanceProvider({ children }) {
  const [stored, setStored] = useState(readStored);
  const [site, setSite] = useState({ defaultTheme: 'dark', toggleEnabled: false });
  const [system, setSystem] = useState(systemAppearance);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest('/pages/settings', { signal: controller.signal })
      .then((data) => {
        const appearance = data?.settings?.appearance;
        if (!appearance) return;
        setSite({
          defaultTheme: SITE_DEFAULTS.includes(appearance.defaultTheme) ? appearance.defaultTheme : 'dark',
          toggleEnabled: appearance.toggleEnabled !== false,
        });
      })
      .catch((failure) => {
        if (failure.code !== 'ABORTED') setSite({ defaultTheme: 'dark', toggleEnabled: false });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!media) return undefined;
    const onChange = (event) => setSystem(event.matches ? 'light' : 'dark');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // 'system' means the visitor's own light/dark setting decides, until they pick.
  const followSystem = stored ? false : site.defaultTheme === 'system';
  const theme = stored || (site.defaultTheme === 'system' ? system : site.defaultTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === 'light' ? 'light' : 'dark';
  }, [theme]);

  const setAppearance = useCallback((next) => {
    const value = APPEARANCES.includes(next) ? next : null;
    setStored(value);
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* the choice still applies for this visit */
    }
  }, []);

  const value = useMemo(
    () => ({ theme, setAppearance, toggleEnabled: site.toggleEnabled, followSystem, source: stored ? 'visitor' : 'site' }),
    [theme, setAppearance, site.toggleEnabled, followSystem, stored],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('useAppearance must be used inside AppearanceProvider');
  return context;
}
