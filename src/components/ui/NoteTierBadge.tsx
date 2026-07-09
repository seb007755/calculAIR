import type { NoteTier } from '../../types/models';
import { noteTierLabels } from '../../lib/strings';
import styles from './NoteTierBadge.module.css';

interface Props {
  tier: NoteTier;
  onClick?: () => void;
  title?: string;
}

/** Small pyramid badge (Kopf/Herz/Basis/Modifier). Clickable to cycle tiers. */
export function NoteTierBadge({ tier, onClick, title }: Props) {
  const cls = [styles.badge, styles[tier], onClick ? styles.clickable : ''].join(' ');
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick} title={title}>
        {noteTierLabels[tier]}
      </button>
    );
  }
  return (
    <span className={cls} title={title}>
      {noteTierLabels[tier]}
    </span>
  );
}
