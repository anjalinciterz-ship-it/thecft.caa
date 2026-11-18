import { Icon } from './icons';
import { useAppearance } from '../lib/appearance';

/* The theme choice left the navbar, so it lives in the footer instead: one
   bolt that names the appearance the next click brings. The member shell
   carries the same control in its own footer, so there is one switch to find
   wherever a visitor happens to be standing. */
export default function ThemeSwitch() {
  const { theme, setAppearance, toggleEnabled } = useAppearance();
  if (!toggleEnabled) return null;
  const next = theme === 'light' ? 'dark' : 'light';
  const label = next === 'light' ? 'Switch to lighter' : 'Switch to cosmic';
  return (
    <button
      type="button"
      className="ft-theme"
      onClick={() => setAppearance(next)}
      aria-label={label}
    >
      <Icon name="bolt" size={15} />
      {label}
    </button>
  );
}
