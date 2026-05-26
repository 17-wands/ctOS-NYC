import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StationSearch } from './StationSearch';
import { createMockStopsIndex, mockStops } from './__fixtures__/mockStopsIndex';

describe('StationSearch', () => {
  const stopsIndex = createMockStopsIndex();
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders input with label', () => {
    render(
      <StationSearch
        stopsIndex={stopsIndex}
        value={null}
        onChange={mockOnChange}
        placeholder="Search stations"
        label="ORIGIN STATION"
        id="origin-search"
      />,
    );

    expect(screen.getByLabelText('ORIGIN STATION')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search stations')).toBeInTheDocument();
  });

  it('shows dropdown with results on input', async () => {
    render(
      <StationSearch
        stopsIndex={stopsIndex}
        value={null}
        onChange={mockOnChange}
        placeholder="Search stations"
        label="ORIGIN STATION"
        id="origin-search"
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Times' } });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('Times Sq-42 St')).toBeInTheDocument();
    });
  });

  it('filters results to stations only', async () => {
    render(
      <StationSearch
        stopsIndex={stopsIndex}
        value={null}
        onChange={mockOnChange}
        placeholder="Search stations"
        label="ORIGIN STATION"
        id="origin-search"
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'St' } });

    await waitFor(() => {
      const options = screen.queryAllByRole('option');
      // All results should be stations (locationType === 'STATION')
      options.forEach((option) => {
        const text = option.textContent || '';
        const matchingStop = mockStops.find((stop) => text.includes(stop.name));
        expect(matchingStop?.locationType).toBe('STATION');
      });
    });
  });

  it('calls onChange when a stop is selected by click', async () => {
    render(
      <StationSearch
        stopsIndex={stopsIndex}
        value={null}
        onChange={mockOnChange}
        placeholder="Search stations"
        label="ORIGIN STATION"
        id="origin-search"
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Union' } });

    await waitFor(() => {
      expect(screen.getByText('14 St - Union Sq')).toBeInTheDocument();
    });

    const option = screen.getByText('14 St - Union Sq');
    fireEvent.click(option);

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '14 St - Union Sq',
        sourceStopId: 'L03',
      }),
    );
  });

  it('navigates options with arrow keys', async () => {
    render(
      <StationSearch
        stopsIndex={stopsIndex}
        value={null}
        onChange={mockOnChange}
        placeholder="Search stations"
        label="ORIGIN STATION"
        id="origin-search"
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'St' } });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    // Press down arrow
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('data-selected', 'true');

    // Press down again
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options[1]).toHaveAttribute('data-selected', 'true');

    // Press up
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(options[0]).toHaveAttribute('data-selected', 'true');
  });

  it('selects stop with Enter key', async () => {
    render(
      <StationSearch
        stopsIndex={stopsIndex}
        value={null}
        onChange={mockOnChange}
        placeholder="Search stations"
        label="ORIGIN STATION"
        id="origin-search"
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Union' } });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '14 St - Union Sq',
      }),
    );
  });

  it('closes dropdown with Escape key', async () => {
    render(
      <StationSearch
        stopsIndex={stopsIndex}
        value={null}
        onChange={mockOnChange}
        placeholder="Search stations"
        label="ORIGIN STATION"
        id="origin-search"
      />,
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Times' } });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('displays selected stop name and ID', () => {
    const selectedStop = mockStops[0];
    if (!selectedStop) throw new Error('Test fixture missing'); // 59 St - Columbus Circle

    render(
      <StationSearch
        stopsIndex={stopsIndex}
        value={selectedStop}
        onChange={mockOnChange}
        placeholder="Search stations"
        label="ORIGIN STATION"
        id="origin-search"
      />,
    );

    expect(screen.getByDisplayValue('59 St - Columbus Circle')).toBeInTheDocument();
    expect(screen.getByText('A24')).toBeInTheDocument();
  });

  it('shows error message when error prop is provided', () => {
    render(
      <StationSearch
        stopsIndex={stopsIndex}
        value={null}
        onChange={mockOnChange}
        placeholder="Search stations"
        label="ORIGIN STATION"
        id="origin-search"
        error="ORIGIN REQUIRED"
      />,
    );

    expect(screen.getByText('ORIGIN REQUIRED')).toBeInTheDocument();
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('data-error', 'true');
  });

  it('shows "NO STATIONS FOUND" when search returns no results', async () => {
    render(
      <StationSearch
        stopsIndex={stopsIndex}
        value={null}
        onChange={mockOnChange}
        placeholder="Search stations"
        label="ORIGIN STATION"
        id="origin-search"
      />,
    );

    const input = screen.getByRole('combobox');
    // Search for something that definitely won't match
    fireEvent.change(input, { target: { value: 'ZZZZZZZZZ' } });

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
