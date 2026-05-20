import { fireEvent, render, screen } from '@testing-library/react';
import { Button, type ButtonVariant } from './Button';

const VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'destructive'];

describe('Button', () => {
  it.each(VARIANTS)('should render the %s variant with its label', (variant) => {
    render(<Button variant={variant}>AUTHORIZE</Button>);

    const button = screen.getByRole('button', { name: 'AUTHORIZE' });

    expect(button).toHaveAttribute('data-variant', variant);
  });

  it('should default to the primary variant', () => {
    render(<Button>DEPLOY</Button>);

    expect(screen.getByRole('button', { name: 'DEPLOY' })).toHaveAttribute(
      'data-variant',
      'primary',
    );
  });

  it('should set the type attribute to button by default', () => {
    render(<Button>DEPLOY</Button>);

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('should call the click handler when pressed', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>DEPLOY</Button>);

    fireEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should render the disabled state', () => {
    render(<Button disabled>DEPLOY</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
