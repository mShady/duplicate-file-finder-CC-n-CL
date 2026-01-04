import { Loader2, FolderOpen, Clock, Zap } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatBytes, formatDuration } from '../lib/utils';

export function ScanningView() {
  const { scanProgress } = useStore();

  const phaseLabels = {
    Discovering: 'Discovering files',
    Grouping: 'Grouping by size',
    QuickHashing: 'Quick hash comparison',
    FullHashing: 'Full file verification',
    Complete: 'Scan complete',
  };

  const phaseDescriptions = {
    Discovering: 'Scanning directories for files...',
    Grouping: 'Finding files with matching sizes...',
    QuickHashing: 'Comparing first 4KB of potential duplicates...',
    FullHashing: 'Verifying duplicates with full file hash...',
    Complete: 'Processing results...',
  };

  // Calculate overall progress across all phases
  const getOverallProgress = () => {
    if (!scanProgress) return 0;
    const phaseWeight = 100 / scanProgress.total_phases;
    const completedPhases = (scanProgress.phase_number - 1) * phaseWeight;
    const currentPhaseProgress = scanProgress.files_found > 0
      ? (scanProgress.files_processed / scanProgress.files_found) * phaseWeight
      : 0;
    return Math.min(completedPhases + currentPhaseProgress, 100);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <Loader2 className="h-16 w-16 animate-spin text-primary mb-8" />

      {/* Phase indicator */}
      <div className="text-sm text-muted-foreground mb-2">
        {scanProgress ? `Phase ${scanProgress.phase_number} of ${scanProgress.total_phases}` : 'Initializing...'}
      </div>

      <h2 className="text-2xl font-semibold mb-2">
        {scanProgress ? phaseLabels[scanProgress.phase] : 'Starting scan...'}
      </h2>

      <p className="text-muted-foreground mb-6">
        {scanProgress ? phaseDescriptions[scanProgress.phase] : 'Preparing...'}
      </p>

      {scanProgress && (
        <div className="w-full max-w-lg space-y-4">
          {/* Current directory */}
          {scanProgress.current_directory && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              <FolderOpen className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{scanProgress.current_directory}</span>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-2xl font-bold">{scanProgress.files_found.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Files Found</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-2xl font-bold">{scanProgress.files_processed.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Processed</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="text-2xl font-bold">{formatBytes(scanProgress.bytes_processed)}</div>
              <div className="text-xs text-muted-foreground">Data Scanned</div>
            </div>
          </div>

          {/* Speed and time */}
          <div className="flex justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              <span>{Math.round(scanProgress.files_per_second)} files/sec</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Elapsed: {formatDuration(scanProgress.elapsed_ms)}</span>
            </div>
            {scanProgress.estimated_remaining_ms && (
              <div className="flex items-center gap-1">
                <span>ETA: {formatDuration(scanProgress.estimated_remaining_ms)}</span>
              </div>
            )}
          </div>

          {/* Overall progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Overall Progress</span>
              <span>{Math.round(getOverallProgress())}%</span>
            </div>
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${getOverallProgress()}%` }}
              />
            </div>
          </div>

          {/* Current phase progress bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Current Phase</span>
              <span>
                {scanProgress.files_found > 0
                  ? `${Math.round((scanProgress.files_processed / scanProgress.files_found) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 transition-all duration-300"
                style={{
                  width: scanProgress.files_found > 0
                    ? `${(scanProgress.files_processed / scanProgress.files_found) * 100}%`
                    : '0%'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
