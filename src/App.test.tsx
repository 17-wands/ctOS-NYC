import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('should render the ctOS NYC banner header', () => {
    render(<App />);

    const banner = screen.getByRole('banner');

    expect(banner).toHaveTextContent('ctOS');
    expect(banner).toHaveTextContent('NYC');
  });
});
