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
  files_found: number;
  files_processed: number;
  bytes_processed: number;
  current_file: string | null;
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
