import { create } from 'zustand';
import { ScanProgress, ScanResult, DuplicateGroup } from '../types';

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
