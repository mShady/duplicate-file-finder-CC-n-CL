export interface FileInfo {
  path: string;
  size: number;
  quick_hash: string | null;
  full_hash: string | null;
  modified: number;
  name: string;
  extension: string | null;
}

export interface DuplicateGroup {
  hash: string;
  size: number;
  files: FileInfo[];
}

export interface ScanProgress {
  phase: 'Discovering' | 'Grouping' | 'QuickHashing' | 'FullHashing' | 'Complete';
  phase_number: number;           // Current phase (1-4)
  total_phases: number;           // Total phases (4)
  files_found: number;
  files_processed: number;
  bytes_processed: number;
  current_file: string | null;
  current_directory: string | null;  // Parent directory being scanned
  elapsed_ms: number;             // Time elapsed since scan start
  files_per_second: number;       // Processing speed
  estimated_remaining_ms: number | null; // ETA (when calculable)
}

export interface ScanResult {
  duplicates: DuplicateGroup[];
  total_files: number;
  total_duplicate_size: number;
  scan_duration_ms: number;
}

export interface DeleteResult {
  deleted_count: number;
  trash_location: string;
}
