import type { LabelHTMLAttributes, ReactNode } from 'react';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
}

/** Uppercase 11px field label per the design system. */
export function Label({ children, className, ...rest }: LabelProps) {
  return (
    <label className={['label', className ?? ''].filter(Boolean).join(' ')} {...rest}>
      {children}
    </label>
  );
}
