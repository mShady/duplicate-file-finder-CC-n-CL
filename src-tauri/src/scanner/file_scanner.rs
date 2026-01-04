use super::types::*;
use super::HashEngine;
use rayon::prelude::*;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

pub struct FileScanner {
    min_file_size: u64,
    excluded_dirs: Vec<String>,
}

impl FileScanner {
    pub fn new() -> Self {
        Self {
            min_file_size: 1, // Skip empty files
            excluded_dirs: vec![
                ".git".to_string(),
                "node_modules".to_string(),
                ".Trash".to_string(),
                "$RECYCLE.BIN".to_string(),
                "System Volume Information".to_string(),
            ],
        }
    }

    pub fn scan(&self, paths: Vec<PathBuf>, app: AppHandle) -> Result<ScanResult, String> {
        let start_time = Instant::now();
        let files_found = AtomicU64::new(0);
        let files_processed = AtomicU64::new(0);

        // Phase 1: Discover all files
        self.emit_progress(&app, ScanPhase::Discovering, 0, 0, None);

        let mut all_files: Vec<FileInfo> = Vec::new();
        for path in &paths {
            let files = self.discover_files(path, &app, &files_found);
            all_files.extend(files);
        }

        let total_files = all_files.len() as u64;

        // Phase 2: Group by size (instant filter - eliminates unique sizes)
        self.emit_progress(&app, ScanPhase::Grouping, total_files, 0, None);

        let size_groups: HashMap<u64, Vec<FileInfo>> = all_files
            .into_iter()
            .fold(HashMap::new(), |mut acc, file| {
                acc.entry(file.size).or_default().push(file);
                acc
            });

        // Filter to only sizes with multiple files (potential duplicates)
        let potential_duplicates: Vec<FileInfo> = size_groups
            .into_iter()
            .filter(|(_, files)| files.len() > 1)
            .flat_map(|(_, files)| files)
            .collect();

        let potential_count = potential_duplicates.len() as u64;

        // Phase 3: Quick hash (first 4KB) - fast filter for same-size files
        self.emit_progress(&app, ScanPhase::QuickHashing, potential_count, 0, None);
        files_processed.store(0, Ordering::Relaxed);

        let quick_hashed: Vec<FileInfo> = potential_duplicates
            .into_par_iter()
            .filter_map(|mut file| {
                let count = files_processed.fetch_add(1, Ordering::Relaxed);
                if count.is_multiple_of(100) {
                    let _ = app.emit("scan-progress", ScanProgress {
                        phase: ScanPhase::QuickHashing,
                        files_found: potential_count,
                        files_processed: count,
                        bytes_processed: 0,
                        current_file: Some(file.path.display().to_string()),
                    });
                }

                match HashEngine::compute_quick_hash(&file.path, file.size) {
                    Ok(hash) => {
                        file.quick_hash = Some(hash);
                        Some(file)
                    }
                    Err(_) => None,
                }
            })
            .collect();

        // Group by quick hash - only files with matching quick hashes need full hashing
        let quick_hash_groups: HashMap<String, Vec<FileInfo>> = quick_hashed
            .into_iter()
            .fold(HashMap::new(), |mut acc, file| {
                if let Some(ref hash) = file.quick_hash {
                    acc.entry(hash.clone()).or_default().push(file);
                }
                acc
            });

        // Filter to only quick hashes with multiple files
        let needs_full_hash: Vec<FileInfo> = quick_hash_groups
            .into_iter()
            .filter(|(_, files)| files.len() > 1)
            .flat_map(|(_, files)| files)
            .collect();

        let needs_full_count = needs_full_hash.len() as u64;

        // Phase 4: Full hash - only for files that passed quick hash filter
        self.emit_progress(&app, ScanPhase::FullHashing, needs_full_count, 0, None);
        files_processed.store(0, Ordering::Relaxed);

        let fully_hashed: Vec<FileInfo> = needs_full_hash
            .into_par_iter()
            .filter_map(|mut file| {
                let count = files_processed.fetch_add(1, Ordering::Relaxed);
                if count.is_multiple_of(50) {
                    let _ = app.emit("scan-progress", ScanProgress {
                        phase: ScanPhase::FullHashing,
                        files_found: needs_full_count,
                        files_processed: count,
                        bytes_processed: 0,
                        current_file: Some(file.path.display().to_string()),
                    });
                }

                match HashEngine::compute_hash(&file.path) {
                    Ok(hash) => {
                        file.full_hash = Some(hash);
                        Some(file)
                    }
                    Err(_) => None,
                }
            })
            .collect();

        // Group by full hash to find true duplicates
        let hash_groups: HashMap<String, Vec<FileInfo>> = fully_hashed
            .into_iter()
            .fold(HashMap::new(), |mut acc, file| {
                if let Some(ref hash) = file.full_hash {
                    acc.entry(hash.clone()).or_default().push(file);
                }
                acc
            });

        // Build duplicate groups
        let duplicates: Vec<DuplicateGroup> = hash_groups
            .into_iter()
            .filter(|(_, files)| files.len() > 1)
            .map(|(hash, files)| {
                let size = files.first().map(|f| f.size).unwrap_or(0);
                DuplicateGroup { hash, size, files }
            })
            .collect();

        let total_duplicate_size: u64 = duplicates
            .iter()
            .map(|g| g.size * (g.files.len() as u64 - 1))
            .sum();

        self.emit_progress(&app, ScanPhase::Complete, total_files, total_files, None);

        Ok(ScanResult {
            duplicates,
            total_files,
            total_duplicate_size,
            scan_duration_ms: start_time.elapsed().as_millis() as u64,
        })
    }

    fn discover_files(&self, root: &Path, app: &AppHandle, counter: &AtomicU64) -> Vec<FileInfo> {
        WalkDir::new(root)
            .follow_links(false)
            .into_iter()
            .filter_entry(|e| {
                let name = e.file_name().to_string_lossy();
                !self.excluded_dirs.iter().any(|ex| name == *ex)
            })
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.file_type().is_file())
            .filter_map(|entry| {
                let metadata = entry.metadata().ok()?;
                let size = metadata.len();

                if size < self.min_file_size {
                    return None;
                }

                let count = counter.fetch_add(1, Ordering::Relaxed);
                if count.is_multiple_of(1000) {
                    let _ = app.emit("scan-progress", ScanProgress {
                        phase: ScanPhase::Discovering,
                        files_found: count,
                        files_processed: 0,
                        bytes_processed: 0,
                        current_file: Some(entry.path().display().to_string()),
                    });
                }

                Some(FileInfo {
                    path: entry.path().to_path_buf(),
                    size,
                    quick_hash: None,
                    full_hash: None,
                    modified: metadata
                        .modified()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs() as i64)
                        .unwrap_or(0),
                    name: entry.file_name().to_string_lossy().to_string(),
                    extension: entry
                        .path()
                        .extension()
                        .map(|e| e.to_string_lossy().to_string()),
                })
            })
            .collect()
    }

    fn emit_progress(&self, app: &AppHandle, phase: ScanPhase, found: u64, processed: u64, file: Option<String>) {
        let _ = app.emit("scan-progress", ScanProgress {
            phase,
            files_found: found,
            files_processed: processed,
            bytes_processed: 0,
            current_file: file,
        });
    }
}

impl Default for FileScanner {
    fn default() -> Self {
        Self::new()
    }
}
