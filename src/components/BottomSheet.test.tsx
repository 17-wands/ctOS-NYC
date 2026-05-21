import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomSheet } from './BottomSheet';

describe('BottomSheet', () => {
  it('renders with children', () => {
    render(
      <BottomSheet isExpanded={false} onToggle={vi.fn()}>
        <div>Test content</div>
      </BottomSheet>,
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('sets data-expanded attribute based on isExpanded prop', () => {
    const { rerender } = render(
      <BottomSheet isExpanded={false} onToggle={vi.fn()}>
        Content
      </BottomSheet>,
    );

    const sheet = screen.getByRole('region', { name: 'Route results' });
    expect(sheet).toHaveAttribute('data-expanded', 'false');

    rerender(
      <BottomSheet isExpanded={true} onToggle={vi.fn()}>
        Content
      </BottomSheet>,
    );

    expect(sheet).toHaveAttribute('data-expanded', 'true');
  });

  it('calls onToggle when handle button is clicked', () => {
    const onToggle = vi.fn();

    render(
      <BottomSheet isExpanded={false} onToggle={onToggle}>
        Content
      </BottomSheet>,
    );

    const button = screen.getByRole('button', { name: 'Expand results' });
    fireEvent.click(button);

    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('shows correct aria-label for collapsed state', () => {
    render(
      <BottomSheet isExpanded={false} onToggle={vi.fn()}>
        Content
      </BottomSheet>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName('Expand results');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows correct aria-label for expanded state', () => {
    render(
      <BottomSheet isExpanded={true} onToggle={vi.fn()}>
        Content
      </BottomSheet>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAccessibleName('Collapse results');
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('has proper ARIA region role and label', () => {
    render(
      <BottomSheet isExpanded={false} onToggle={vi.fn()}>
        Content
      </BottomSheet>,
    );

    const region = screen.getByRole('region', { name: 'Route results' });
    expect(region).toBeInTheDocument();
  });
});
