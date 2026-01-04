import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { FolderOpen, HardDrive } from 'lucide-react';
import { Button } from './ui/Button';
import { useStore } from '../store/useStore';
import { ScanProgress, ScanResult } from '../types';

export function HomeView() {
  const {
    setSelectedPaths,
    setIsScanning,
    setScanProgress,
    setScanResult,
    setCurrentView
  } = useStore();

  useEffect(() => {
    const unlisten = listen<ScanProgress>('scan-progress', (event) => {
      setScanProgress(event.payload);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setScanProgress]);

  const handleSelectFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: true,
      title: 'Select folders to scan',
    });

    if (selected) {
      const paths = Array.isArray(selected) ? selected : [selected];
      setSelectedPaths(paths);
      startScan(paths);
    }
  };

  const handleScanHome = async () => {
    const homePath = await invoke<string>('get_home_dir').catch(() => {
      // Fallback paths
      if (navigator.platform.includes('Win')) {
        return 'C:\\Users';
      }
      return '/Users';
    });
    setSelectedPaths([homePath]);
    startScan([homePath]);
  };

  const startScan = async (paths: string[]) => {
    setIsScanning(true);
    setCurrentView('scanning');

    try {
      const result = await invoke<ScanResult>('start_scan', { paths });
      setScanResult(result);
      setCurrentView('results');
    } catch (error) {
      console.error('Scan failed:', error);
      alert(`Scan failed: ${error}`);
      setCurrentView('home');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Duplicate File Finder</h1>
        <p className="text-muted-foreground text-lg">
          Find and remove duplicate files to free up disk space
        </p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-md">
        <Button
          size="lg"
          className="h-16 text-lg"
          onClick={handleSelectFolder}
        >
          <FolderOpen className="mr-2 h-6 w-6" />
          Select Folders to Scan
        </Button>

        <Button
          size="lg"
          variant="secondary"
          className="h-16 text-lg"
          onClick={handleScanHome}
        >
          <HardDrive className="mr-2 h-6 w-6" />
          Scan Home Directory
        </Button>
      </div>

      <p className="mt-8 text-sm text-muted-foreground text-center max-w-md">
        Files are compared by their content, not their names.
        Deleted files will be moved to your system trash.
      </p>
    </div>
  );
}
