import { useEffect, useRef, useState } from 'react';
import { parseNumber } from '../../lib/units';
import styles from './NumberInput.module.css';

interface NumberInputProps {
  value: number;
  onValueChange: (value: number) => void;
  suffix?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  align?: 'right' | 'left';
}

/** Turn a numeric value into an editable string (comma-friendly, no trailing noise). */
function toText(value: number): string {
  if (!Number.isFinite(value)) return '';
  // Keep it plain; the user may re-type with comma or dot.
  return String(value);
}

/**
 * Monospace, right-aligned numeric input with a fixed unit suffix.
 * Accepts both comma and dot decimals; normalizes to a number on change.
 */
export function NumberInput({
  value,
  onValueChange,
  suffix,
  placeholder,
  min,
  max,
  disabled,
  ariaLabel,
  className,
  align = 'right',
}: NumberInputProps) {
  const [text, setText] = useState<string>(toText(value));
  const focused = useRef(false);

  // Sync external value in when not actively editing.
  useEffect(() => {
    if (!focused.current) setText(toText(value));
  }, [value]);

  const commit = (raw: string) => {
    setText(raw);
    // Allow intermediate states like "", "-", "1," without fighting the user.
    if (raw === '' || raw === '-' || raw === ',' || raw === '.') {
      onValueChange(0);
      return;
    }
    let n = parseNumber(raw);
    if (typeof min === 'number' && n < min) n = min;
    if (typeof max === 'number' && n > max) n = max;
    onValueChange(n);
  };

  return (
    <div
      className={[styles.wrap, disabled ? styles.disabled : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <input
        className={styles.input}
        style={{ textAlign: align }}
        type="text"
        inputMode="decimal"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        onFocus={() => {
          focused.current = true;
        }}
        onBlur={() => {
          focused.current = false;
          setText(toText(value));
        }}
        onChange={(e) => {
          // Only digits, separators and a leading minus.
          const cleaned = e.target.value.replace(/[^0-9.,-]/g, '');
          commit(cleaned);
        }}
      />
      {suffix && <span className={styles.suffix}>{suffix}</span>}
    </div>
  );
}
