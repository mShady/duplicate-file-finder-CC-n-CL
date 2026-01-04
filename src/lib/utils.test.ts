import { describe, it, expect } from 'vitest';
import { cn, formatBytes, formatDuration, formatDate } from './utils';

describe('cn', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', true && 'visible')).toBe('base visible');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });
});

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });
});

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
  });

  it('formats seconds', () => {
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(30000)).toBe('30.0s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(125000)).toBe('2m 5s');
  });
});

describe('formatDate', () => {
  it('formats today', () => {
    const now = Math.floor(Date.now() / 1000);
    expect(formatDate(now)).toBe('Today');
  });

  it('formats yesterday', () => {
    const yesterday = Math.floor(Date.now() / 1000) - 86400;
    expect(formatDate(yesterday)).toBe('Yesterday');
  });

  it('formats days ago', () => {
    const threeDaysAgo = Math.floor(Date.now() / 1000) - (86400 * 3);
    expect(formatDate(threeDaysAgo)).toBe('3 days ago');
  });

  it('formats older dates with full date', () => {
    const oldDate = Math.floor(new Date('2023-06-15').getTime() / 1000);
    const result = formatDate(oldDate);
    expect(result).toContain('2023');
    expect(result).toContain('Jun');
  });
});
