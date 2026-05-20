import { render, screen } from '@testing-library/react';
import { Label, Mono } from './Text';

describe('Label', () => {
  it('should render its children', () => {
    render(<Label>Interface Label</Label>);

    expect(screen.getByText('Interface Label')).toBeInTheDocument();
  });
});

describe('Mono', () => {
  it('should render its children', () => {
    render(<Mono>TRC-4472</Mono>);

    expect(screen.getByText('TRC-4472')).toBeInTheDocument();
  });
});
