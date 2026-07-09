import type { SelectHTMLAttributes } from 'react';
import styles from './Field.module.css';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: Option[];
}

export function Select({ options, children, className, ...rest }: SelectProps) {
  return (
    <select className={[styles.select, className ?? ''].filter(Boolean).join(' ')} {...rest}>
      {options
        ? options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))
        : children}
    </select>
  );
}
