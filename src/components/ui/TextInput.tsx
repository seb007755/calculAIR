import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import styles from './Field.module.css';

type TextInputProps = InputHTMLAttributes<HTMLInputElement>;

export function TextInput({ className, ...rest }: TextInputProps) {
  return <input className={[styles.field, className ?? ''].filter(Boolean).join(' ')} {...rest} />;
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ className, ...rest }: TextAreaProps) {
  return (
    <textarea
      className={[styles.field, styles.textarea, className ?? ''].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}
