import { create } from 'zustand';
import { ScanProgress, ScanResult, DuplicateGroup, FileInfo } from '../types';

// Helper function to sort files by modification date
const sortByModified = (files: FileInfo[], ascending: boolean): FileInfo[] => {
  return [...files].sort((a, b) =>
    ascending ? a.modified - b.modified : b.modified - a.modified
  );
};

interface AppState {
  // Scan state
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  scanResult: ScanResult | null;
  selectedPaths: string[];

  // Selection state
  selectedFiles: Set<string>;

  // UI state
  currentView: 'home' | 'scanning' | 'results';

  // Actions
  setIsScanning: (scanning: boolean) => void;
  setScanProgress: (progress: ScanProgress | null) => void;
  setScanResult: (result: ScanResult | null) => void;
  setSelectedPaths: (paths: string[]) => void;
  toggleFileSelection: (path: string) => void;
  selectAllInGroup: (group: DuplicateGroup, keepFirst: boolean) => void;
  selectOldestInGroup: (group: DuplicateGroup) => void;
  selectNewestInGroup: (group: DuplicateGroup) => void;
  selectAllOldest: () => void;
  selectAllNewest: () => void;
  clearSelection: () => void;
  setCurrentView: (view: 'home' | 'scanning' | 'results') => void;
  reset: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  isScanning: false,
  scanProgress: null,
  scanResult: null,
  selectedPaths: [],
  selectedFiles: new Set(),
  currentView: 'home',

  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  setScanResult: (result) => set({ scanResult: result }),
  setSelectedPaths: (paths) => set({ selectedPaths: paths }),

  toggleFileSelection: (path) => set((state) => {
    const newSet = new Set(state.selectedFiles);
    if (newSet.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    return { selectedFiles: newSet };
  }),

  selectAllInGroup: (group, keepFirst) => set((state) => {
    const newSet = new Set(state.selectedFiles);
    const filesToSelect = keepFirst ? group.files.slice(1) : group.files;
    filesToSelect.forEach((file) => newSet.add(file.path));
    return { selectedFiles: newSet };
  }),

  // Select all files except the oldest (keep oldest)
  selectOldestInGroup: (group) => set((state) => {
    const newSet = new Set(state.selectedFiles);
    const sorted = sortByModified(group.files, true); // oldest first
    // Select all except the oldest (first after sorting)
    sorted.slice(1).forEach((file) => newSet.add(file.path));
    return { selectedFiles: newSet };
  }),

  // Select all files except the newest (keep newest)
  selectNewestInGroup: (group) => set((state) => {
    const newSet = new Set(state.selectedFiles);
    const sorted = sortByModified(group.files, false); // newest first
    // Select all except the newest (first after sorting)
    sorted.slice(1).forEach((file) => newSet.add(file.path));
    return { selectedFiles: newSet };
  }),

  // Select oldest in ALL groups (keep newest in each group)
  selectAllOldest: () => set(() => {
    const newSet = new Set<string>();
    const { scanResult } = get();
    if (!scanResult) return { selectedFiles: newSet };

    scanResult.duplicates.forEach((group) => {
      const sorted = sortByModified(group.files, true); // oldest first
      // Select all except the oldest
      sorted.slice(1).forEach((file) => newSet.add(file.path));
    });
    return { selectedFiles: newSet };
  }),

  // Select newest in ALL groups (keep oldest in each group)
  selectAllNewest: () => set(() => {
    const newSet = new Set<string>();
    const { scanResult } = get();
    if (!scanResult) return { selectedFiles: newSet };

    scanResult.duplicates.forEach((group) => {
      const sorted = sortByModified(group.files, false); // newest first
      // Select all except the newest
      sorted.slice(1).forEach((file) => newSet.add(file.path));
    });
    return { selectedFiles: newSet };
  }),

  clearSelection: () => set({ selectedFiles: new Set() }),

  setCurrentView: (view) => set({ currentView: view }),

  reset: () => set({
    isScanning: false,
    scanProgress: null,
    scanResult: null,
    selectedFiles: new Set(),
    currentView: 'home',
  }),
}));
