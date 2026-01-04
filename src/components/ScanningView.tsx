import { Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export function ScanningView() {
  const { scanProgress } = useStore();

  const phaseLabels = {
    Discovering: 'Discovering files...',
    Grouping: 'Grouping by size...',
    QuickHashing: 'Quick hash (first 4KB)...',
    FullHashing: 'Full file hashing...',
    Complete: 'Scan complete!',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <Loader2 className="h-16 w-16 animate-spin text-primary mb-8" />

      <h2 className="text-2xl font-semibold mb-4">
        {scanProgress ? phaseLabels[scanProgress.phase] : 'Starting scan...'}
      </h2>

      {scanProgress && (
        <div className="text-center space-y-2 text-muted-foreground">
          <p>Files found: {scanProgress.files_found.toLocaleString()}</p>
          <p>Files processed: {scanProgress.files_processed.toLocaleString()}</p>
          {scanProgress.current_file && (
            <p className="text-sm truncate max-w-md">
              {scanProgress.current_file}
            </p>
          )}
        </div>
      )}

      <div className="w-full max-w-md mt-8">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: scanProgress && scanProgress.files_found > 0
                ? `${(scanProgress.files_processed / scanProgress.files_found) * 100}%`
                : '0%'
            }}
          />
        </div>
      </div>
    </div>
  );
}
