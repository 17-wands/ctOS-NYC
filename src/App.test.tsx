import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
    // Hold the timetable load open so the boot sequence renders. Tests that
    // need the ready or error state stub fetch with their own behavior.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );
  });

  it('should render the ctOS NYC banner header', () => {
    const { container } = render(<App />);

    // The app-shell <header> is the document-level banner; Panel's inner
    // <header> strip has no implicit role per HTML spec (descendant of
    // <section>), but jsdom does not apply that rule, so query by class.
    const banner = container.querySelector('header.app-header');

    expect(banner).not.toBeNull();
    expect(banner).toHaveTextContent('ctOS');
    expect(banner).toHaveTextContent('NYC');
  });

  it('should render the component sandbox on the /components route', () => {
    window.history.pushState({}, '', '/components');

    render(<App />);

    expect(screen.getByRole('heading', { name: 'COMPONENT LIBRARY' })).toBeInTheDocument();
  });

  it('should render the boot sequence while loading the timetable', () => {
    render(<App />);

    // BootSequence Panel: title + at least the first stage label.
    expect(screen.getByLabelText('Boot sequence stages')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'BOOT SEQUENCE' })).toBeInTheDocument();
  });
});
