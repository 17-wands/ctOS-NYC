import { describe, expect, it } from 'vitest';
import { lineColor, lineTextColor, lineDivision, DEFAULT_LINE_COLOR } from './lineColors';

describe('lineColor', () => {
  it('returns the correct color for known routes', () => {
    expect(lineColor('1')).toBe('#ee352e');
    expect(lineColor('4')).toBe('#00933c');
    expect(lineColor('A')).toBe('#0039a6');
    expect(lineColor('L')).toBe('#a7a9ac');
    expect(lineColor('N')).toBe('#fccc0a');
  });

  it('is case-insensitive', () => {
    expect(lineColor('a')).toBe(lineColor('A'));
    expect(lineColor('n')).toBe(lineColor('N'));
  });

  it('returns the scan-blue fallback for unknown routes', () => {
    expect(lineColor('X')).toBe(DEFAULT_LINE_COLOR);
    expect(lineColor(null)).toBe(DEFAULT_LINE_COLOR);
    expect(lineColor(undefined)).toBe(DEFAULT_LINE_COLOR);
  });
});

describe('lineTextColor', () => {
  it('returns black for light-background lines (N/Q/R/W/L)', () => {
    expect(lineTextColor('N')).toBe('#0a0a0a');
    expect(lineTextColor('Q')).toBe('#0a0a0a');
    expect(lineTextColor('L')).toBe('#0a0a0a');
  });

  it('returns white for dark-background lines (1/A/G)', () => {
    expect(lineTextColor('1')).toBe('#ffffff');
    expect(lineTextColor('A')).toBe('#ffffff');
    expect(lineTextColor('G')).toBe('#ffffff');
  });
});

describe('lineDivision', () => {
  it('returns IRT for numbered lines', () => {
    expect(lineDivision('1')).toBe('IRT');
    expect(lineDivision('4')).toBe('IRT');
    expect(lineDivision('7')).toBe('IRT');
  });

  it('returns IND for A/C/E, B/D/F/M, G lines', () => {
    expect(lineDivision('A')).toBe('IND');
    expect(lineDivision('C')).toBe('IND');
    expect(lineDivision('E')).toBe('IND');
    expect(lineDivision('F')).toBe('IND');
    expect(lineDivision('G')).toBe('IND');
  });

  it('returns BMT for N/Q/R/W and J/Z and L lines', () => {
    expect(lineDivision('N')).toBe('BMT');
    expect(lineDivision('Q')).toBe('BMT');
    expect(lineDivision('L')).toBe('BMT');
    expect(lineDivision('J')).toBe('BMT');
    expect(lineDivision('Z')).toBe('BMT');
  });

  it('returns SIR for Staten Island Railway', () => {
    expect(lineDivision('SI')).toBe('SIR');
    expect(lineDivision('SIR')).toBe('SIR');
  });

  it('returns undefined for unknown routes', () => {
    expect(lineDivision('X')).toBeUndefined();
    expect(lineDivision(null)).toBeUndefined();
    expect(lineDivision(undefined)).toBeUndefined();
  });
});
