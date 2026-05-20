import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('should render the ctOS NYC banner header', () => {
    render(<App />);

    const banner = screen.getByRole('banner');

    expect(banner).toHaveTextContent('ctOS');
    expect(banner).toHaveTextContent('NYC');
  });

  it('should render the component sandbox on the /components route', () => {
    window.history.pushState({}, '', '/components');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'COMPONENT LIBRARY' })).toBeInTheDocument();
  });
});
