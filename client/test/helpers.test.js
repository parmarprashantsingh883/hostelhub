import { describe, it, expect } from 'vitest';
import { inr, fmtDate, fmtDateTime } from '../src/components/ui';

describe('inr()', () => {
  it('formats rupees with the Indian grouping', () => {
    expect(inr(0)).toBe('₹0');
    expect(inr(1000)).toBe('₹1,000');
    expect(inr(1234567)).toBe('₹12,34,567');
  });
  it('treats null/undefined as zero', () => {
    expect(inr(null)).toBe('₹0');
    expect(inr(undefined)).toBe('₹0');
  });
});

describe('fmtDate() / fmtDateTime()', () => {
  it('returns an em dash for empty values', () => {
    expect(fmtDate(null)).toBe('—');
    expect(fmtDate('')).toBe('—');
    expect(fmtDateTime(null)).toBe('—');
  });
  it('formats a real date with month + year', () => {
    const s = fmtDate('2026-06-19T12:00:00.000Z');
    expect(s).toMatch(/2026/);
    expect(s).toMatch(/Jun/);
  });
});
