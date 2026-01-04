import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Trash2, CheckSquare, Square, Info } from 'lucide-react';
import { Button } from './ui/Button';
import { useStore } from '../store/useStore';
import { formatBytes, formatDuration } from '../lib/utils';
import { DeleteResult, DuplicateGroup } from '../types';

export function ResultsView() {
  const {
    scanResult,
    selectedFiles,
    toggleFileSelection,
    selectAllInGroup,
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
            onSelectAll={() => selectAllInGroup(group, true)}
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
  onSelectAll: () => void;
}

function DuplicateGroupCard({ group, selectedFiles, onToggle, onSelectAll }: DuplicateGroupCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted px-4 py-3 flex items-center justify-between">
        <div>
          <span className="font-medium">{group.files.length} files</span>
          <span className="text-muted-foreground ml-2">
            {formatBytes(group.size)} each • {formatBytes(group.size * (group.files.length - 1))} recoverable
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onSelectAll}>
          Select all but first
        </Button>
      </div>

      <div className="divide-y">
        {group.files.map((file, index) => (
          <div
            key={file.path}
            className={`px-4 py-3 flex items-center gap-3 hover:bg-muted/50 cursor-pointer ${
              index === 0 ? 'bg-green-50' : ''
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

            {index === 0 && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                Original
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
