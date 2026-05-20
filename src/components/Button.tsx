import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

/**
 * Overlord command button. Variants and states are exposed as `data-variant`
 * so styling and tests both target a stable contract instead of CSS module
 * class names.
 */
export function Button({ variant = 'primary', type, children, ...rest }: ButtonProps) {
  return (
    <button type={type ?? 'button'} className={styles.button} data-variant={variant} {...rest}>
      {children}
    </button>
  );
}
