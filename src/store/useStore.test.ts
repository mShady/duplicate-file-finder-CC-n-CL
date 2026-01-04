import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './useStore';

describe('useStore', () => {
  beforeEach(() => {
    useStore.getState().reset();
  });

  it('has correct initial state', () => {
    const state = useStore.getState();
    expect(state.isScanning).toBe(false);
    expect(state.scanProgress).toBeNull();
    expect(state.scanResult).toBeNull();
    expect(state.currentView).toBe('home');
    expect(state.selectedFiles.size).toBe(0);
  });

  it('sets scanning state', () => {
    useStore.getState().setIsScanning(true);
    expect(useStore.getState().isScanning).toBe(true);
  });

  it('toggles file selection', () => {
    const { toggleFileSelection } = useStore.getState();

    toggleFileSelection('/path/to/file.txt');
    expect(useStore.getState().selectedFiles.has('/path/to/file.txt')).toBe(true);

    toggleFileSelection('/path/to/file.txt');
    expect(useStore.getState().selectedFiles.has('/path/to/file.txt')).toBe(false);
  });

  it('clears selection', () => {
    const { toggleFileSelection, clearSelection } = useStore.getState();

    toggleFileSelection('/path/to/file1.txt');
    toggleFileSelection('/path/to/file2.txt');
    expect(useStore.getState().selectedFiles.size).toBe(2);

    clearSelection();
    expect(useStore.getState().selectedFiles.size).toBe(0);
  });

  it('selects all in group except first', () => {
    const group = {
      hash: 'abc123',
      size: 1024,
      files: [
        { path: '/file1.txt', size: 1024, quick_hash: null, full_hash: 'abc', modified: 0, name: 'file1.txt', extension: 'txt' },
        { path: '/file2.txt', size: 1024, quick_hash: null, full_hash: 'abc', modified: 0, name: 'file2.txt', extension: 'txt' },
        { path: '/file3.txt', size: 1024, quick_hash: null, full_hash: 'abc', modified: 0, name: 'file3.txt', extension: 'txt' },
      ],
    };

    useStore.getState().selectAllInGroup(group, true);
    const selected = useStore.getState().selectedFiles;

    expect(selected.has('/file1.txt')).toBe(false); // First file not selected
    expect(selected.has('/file2.txt')).toBe(true);
    expect(selected.has('/file3.txt')).toBe(true);
  });

  it('changes current view', () => {
    useStore.getState().setCurrentView('scanning');
    expect(useStore.getState().currentView).toBe('scanning');

    useStore.getState().setCurrentView('results');
    expect(useStore.getState().currentView).toBe('results');
  });

  it('resets state correctly', () => {
    const store = useStore.getState();
    store.setIsScanning(true);
    store.setCurrentView('results');
    store.toggleFileSelection('/some/file.txt');

    store.reset();

    const state = useStore.getState();
    expect(state.isScanning).toBe(false);
    expect(state.currentView).toBe('home');
    expect(state.selectedFiles.size).toBe(0);
  });
});

describe('date-based selection', () => {
  const groupWithDates = {
    hash: 'abc123',
    size: 1024,
    files: [
      { path: '/newest.txt', size: 1024, quick_hash: null, full_hash: 'abc', modified: 1700000000, name: 'newest.txt', extension: 'txt' },
      { path: '/middle.txt', size: 1024, quick_hash: null, full_hash: 'abc', modified: 1600000000, name: 'middle.txt', extension: 'txt' },
      { path: '/oldest.txt', size: 1024, quick_hash: null, full_hash: 'abc', modified: 1500000000, name: 'oldest.txt', extension: 'txt' },
    ],
  };

  beforeEach(() => {
    useStore.getState().reset();
    useStore.getState().setScanResult({
      duplicates: [groupWithDates],
      total_files: 3,
      total_duplicate_size: 2048,
      scan_duration_ms: 100,
    });
  });

  it('selectOldestInGroup keeps oldest, selects rest', () => {
    useStore.getState().selectOldestInGroup(groupWithDates);
    const selected = useStore.getState().selectedFiles;

    expect(selected.has('/oldest.txt')).toBe(false); // Oldest kept
    expect(selected.has('/middle.txt')).toBe(true);  // Selected
    expect(selected.has('/newest.txt')).toBe(true);  // Selected
  });

  it('selectNewestInGroup keeps newest, selects rest', () => {
    useStore.getState().selectNewestInGroup(groupWithDates);
    const selected = useStore.getState().selectedFiles;

    expect(selected.has('/newest.txt')).toBe(false); // Newest kept
    expect(selected.has('/middle.txt')).toBe(true);  // Selected
    expect(selected.has('/oldest.txt')).toBe(true);  // Selected
  });

  it('selectAllOldest selects older files in all groups', () => {
    useStore.getState().selectAllOldest();
    const selected = useStore.getState().selectedFiles;

    // Keeps oldest, selects newer files
    expect(selected.has('/oldest.txt')).toBe(false);
    expect(selected.has('/middle.txt')).toBe(true);
    expect(selected.has('/newest.txt')).toBe(true);
  });

  it('selectAllNewest selects older files in all groups', () => {
    useStore.getState().selectAllNewest();
    const selected = useStore.getState().selectedFiles;

    // Keeps newest, selects older files
    expect(selected.has('/newest.txt')).toBe(false);
    expect(selected.has('/middle.txt')).toBe(true);
    expect(selected.has('/oldest.txt')).toBe(true);
  });
});
