import { NavLink } from 'react-router-dom';
import { FlaskConical, FlaskRound, Settings } from 'lucide-react';
import { strings } from '../../lib/strings';
import styles from './Header.module.css';

const navItems = [
  { to: '/', label: strings.nav.dashboard, icon: FlaskRound, end: true },
  { to: '/ingredients', label: strings.nav.ingredients, icon: FlaskConical, end: false },
  { to: '/settings', label: strings.nav.settings, icon: Settings, end: false },
];

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.brand}>
          <span className={styles.mark} aria-hidden>
            ◈
          </span>
          <span className={styles.brandText}>{strings.appName}</span>
        </NavLink>
        <nav className={styles.nav}>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [styles.link, isActive ? styles.active : ''].filter(Boolean).join(' ')
              }
            >
              <Icon size={16} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
