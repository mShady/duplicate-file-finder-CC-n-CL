import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Trash2, CheckSquare, Square, Info,
  Calendar, CalendarClock, ChevronDown
} from 'lucide-react';
import { Button } from './ui/Button';
import { useStore } from '../store/useStore';
import { formatBytes, formatDuration, formatDate } from '../lib/utils';
import { DeleteResult, DuplicateGroup } from '../types';

export function ResultsView() {
  const {
    scanResult,
    selectedFiles,
    toggleFileSelection,
    selectAllInGroup,
    selectOldestInGroup,
    selectNewestInGroup,
    selectAllOldest,
    selectAllNewest,
    clearSelection,
    reset
  } = useStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null);

  if (!scanResult) return null;

  const handleDelete = async () => {
    if (selectedFiles.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to move ${selectedFiles.size} file(s) to trash?`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const result = await invoke<DeleteResult>('delete_files', {
        paths: Array.from(selectedFiles),
      });
      setDeleteResult(result);
      clearSelection();
    } catch (error) {
      alert(`Delete failed: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Scan Results</h1>
          <p className="text-muted-foreground">
            Found {scanResult.duplicates.length} duplicate groups •
            {formatBytes(scanResult.total_duplicate_size)} recoverable •
            Scanned {scanResult.total_files.toLocaleString()} files in {formatDuration(scanResult.scan_duration_ms)}
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>
            New Scan
          </Button>
          <Button
            variant="destructive"
            disabled={selectedFiles.size === 0 || isDeleting}
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected ({selectedFiles.size})
          </Button>
        </div>
      </div>

      {/* Global Selection Actions */}
      {scanResult.duplicates.length > 0 && (
        <div className="mb-6 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Quick Selection</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllOldest}
                title="Select older duplicates in all groups (keep newest)"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Select All But Oldest
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllNewest}
                title="Select newer duplicates in all groups (keep oldest)"
              >
                <CalendarClock className="mr-2 h-4 w-4" />
                Select All But Newest
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Result Alert */}
      {deleteResult && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <Info className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <p className="font-medium text-green-800">
              {deleteResult.deleted_count} file(s) moved to trash
            </p>
            <p className="text-sm text-green-700">
              To restore: {deleteResult.trash_location}
            </p>
          </div>
        </div>
      )}

      {/* No Duplicates */}
      {scanResult.duplicates.length === 0 && (
        <div className="text-center py-16">
          <CheckSquare className="h-16 w-16 mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-semibold">No Duplicates Found</h2>
          <p className="text-muted-foreground">Your files are all unique!</p>
        </div>
      )}

      {/* Duplicate Groups */}
      <div className="space-y-4">
        {scanResult.duplicates.map((group) => (
          <DuplicateGroupCard
            key={group.hash}
            group={group}
            selectedFiles={selectedFiles}
            onToggle={toggleFileSelection}
            onSelectAllButFirst={() => selectAllInGroup(group, true)}
            onSelectOldest={() => selectOldestInGroup(group)}
            onSelectNewest={() => selectNewestInGroup(group)}
          />
        ))}
      </div>
    </div>
  );
}

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  selectedFiles: Set<string>;
  onToggle: (path: string) => void;
  onSelectAllButFirst: () => void;
  onSelectOldest: () => void;
  onSelectNewest: () => void;
}

function DuplicateGroupCard({
  group,
  selectedFiles,
  onToggle,
  onSelectAllButFirst,
  onSelectOldest,
  onSelectNewest
}: DuplicateGroupCardProps) {
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);

  // Sort files by modification date for display (oldest first)
  const sortedFiles = [...group.files].sort((a, b) => a.modified - b.modified);
  const oldestFile = sortedFiles[0];
  const newestFile = sortedFiles[sortedFiles.length - 1];

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted px-4 py-3 flex items-center justify-between">
        <div>
          <span className="font-medium">{group.files.length} files</span>
          <span className="text-muted-foreground ml-2">
            {formatBytes(group.size)} each • {formatBytes(group.size * (group.files.length - 1))} recoverable
          </span>
        </div>

        {/* Selection dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSelectionMenu(!showSelectionMenu)}
          >
            Select
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>

          {showSelectionMenu && (
            <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg z-10 min-w-[180px]">
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                onClick={() => { onSelectAllButFirst(); setShowSelectionMenu(false); }}
              >
                Select all but first
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                onClick={() => { onSelectOldest(); setShowSelectionMenu(false); }}
              >
                <Calendar className="h-4 w-4" />
                Keep oldest, select rest
              </button>
              <button
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
                onClick={() => { onSelectNewest(); setShowSelectionMenu(false); }}
              >
                <CalendarClock className="h-4 w-4" />
                Keep newest, select rest
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="divide-y">
        {group.files.map((file) => {
          const isOldest = file.path === oldestFile.path;
          const isNewest = file.path === newestFile.path;

          return (
            <div
              key={file.path}
              className={`px-4 py-3 flex items-center gap-3 hover:bg-muted/50 cursor-pointer ${
                isOldest ? 'bg-amber-50' : isNewest ? 'bg-blue-50' : ''
              }`}
              onClick={() => onToggle(file.path)}
            >
              {selectedFiles.has(file.path) ? (
                <CheckSquare className="h-5 w-5 text-primary" />
              ) : (
                <Square className="h-5 w-5 text-muted-foreground" />
              )}

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground truncate">{file.path}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-muted-foreground">
                  {formatDate(file.modified)}
                </span>
                {isOldest && group.files.length > 1 && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                    Oldest
                  </span>
                )}
                {isNewest && group.files.length > 1 && !isOldest && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Newest
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
