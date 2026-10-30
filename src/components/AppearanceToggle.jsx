import { Icon } from './icons';
import { useAppearance } from '../lib/appearance';

/**
 * The visitor's own light/dark choice. Only rendered when the site allows it;
 * the setting is presentation and nothing else — signing in, prices and access
 * are identical in both appearances.
 */
export default function AppearanceToggle() {
  const { theme, setAppearance, toggleEnabled, followSystem } = useAppearance();
  if (!toggleEnabled) return null;

  const next = theme === 'light' ? 'dark' : 'light';
  return (
    <button
      type="button"
      className="appearance-toggle"
      onClick={() => setAppearance(next)}
      aria-label={
        followSystem
          ? `Appearance follows your device; switch to ${next}`
          : `Switch to the ${next === 'light' ? 'daylight' : 'cosmic'} appearance`
      }
    >
      <Icon name={next === 'light' ? 'sun' : 'moon'} />
      <span className="ap-word">{next === 'light' ? 'Day' : 'Night'}</span>
    </button>
  );
}
