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
        let bytes_processed = AtomicU64::new(0);

        // Phase 1: Discover all files (phase 1 of 4)
        self.emit_enhanced_progress(
            &app,
            ScanPhase::Discovering,
            1, 4,
            0, 0, 0,
            None,
            None,
            &start_time,
        );

        let mut all_files: Vec<FileInfo> = Vec::new();
        for path in &paths {
            let files = self.discover_files(path, &app, &files_found, &bytes_processed, &start_time);
            all_files.extend(files);
        }

        let total_files = all_files.len() as u64;
        let total_bytes = bytes_processed.load(Ordering::Relaxed);

        // Phase 2: Group by size (instant filter - eliminates unique sizes)
        self.emit_enhanced_progress(
            &app,
            ScanPhase::Grouping,
            2, 4,
            total_files, 0, total_bytes,
            None,
            None,
            &start_time,
        );

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
        self.emit_enhanced_progress(
            &app,
            ScanPhase::QuickHashing,
            3, 4,
            potential_count, 0, 0,
            None,
            None,
            &start_time,
        );
        files_processed.store(0, Ordering::Relaxed);
        bytes_processed.store(0, Ordering::Relaxed);

        let quick_hashed: Vec<FileInfo> = potential_duplicates
            .into_par_iter()
            .filter_map(|mut file| {
                let count = files_processed.fetch_add(1, Ordering::Relaxed);
                let bytes = bytes_processed.fetch_add(file.size.min(4096), Ordering::Relaxed);
                if count.is_multiple_of(100) {
                    self.emit_enhanced_progress(
                        &app,
                        ScanPhase::QuickHashing,
                        3, 4,
                        potential_count, count, bytes,
                        Some(file.path.display().to_string()),
                        file.path.parent().map(|p| p.display().to_string()),
                        &start_time,
                    );
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
        self.emit_enhanced_progress(
            &app,
            ScanPhase::FullHashing,
            4, 4,
            needs_full_count, 0, 0,
            None,
            None,
            &start_time,
        );
        files_processed.store(0, Ordering::Relaxed);
        bytes_processed.store(0, Ordering::Relaxed);

        let fully_hashed: Vec<FileInfo> = needs_full_hash
            .into_par_iter()
            .filter_map(|mut file| {
                let count = files_processed.fetch_add(1, Ordering::Relaxed);
                let bytes = bytes_processed.fetch_add(file.size, Ordering::Relaxed);
                if count.is_multiple_of(50) {
                    self.emit_enhanced_progress(
                        &app,
                        ScanPhase::FullHashing,
                        4, 4,
                        needs_full_count, count, bytes,
                        Some(file.path.display().to_string()),
                        file.path.parent().map(|p| p.display().to_string()),
                        &start_time,
                    );
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

        self.emit_enhanced_progress(
            &app,
            ScanPhase::Complete,
            4, 4,
            total_files, total_files, total_bytes,
            None,
            None,
            &start_time,
        );

        Ok(ScanResult {
            duplicates,
            total_files,
            total_duplicate_size,
            scan_duration_ms: start_time.elapsed().as_millis() as u64,
        })
    }

    #[allow(clippy::too_many_arguments)]
    fn emit_enhanced_progress(
        &self,
        app: &AppHandle,
        phase: ScanPhase,
        phase_number: u8,
        total_phases: u8,
        found: u64,
        processed: u64,
        bytes: u64,
        file: Option<String>,
        directory: Option<String>,
        start_time: &Instant,
    ) {
        let elapsed_ms = start_time.elapsed().as_millis() as u64;
        let files_per_second = if elapsed_ms > 0 {
            (processed as f64) / (elapsed_ms as f64 / 1000.0)
        } else {
            0.0
        };

        // Estimate remaining time based on current phase progress
        let estimated_remaining_ms = if processed > 0 && found > processed {
            let remaining_files = found - processed;
            let ms_per_file = elapsed_ms as f64 / processed as f64;
            Some((remaining_files as f64 * ms_per_file) as u64)
        } else {
            None
        };

        let current_directory = file.as_ref().and_then(|f| {
            std::path::Path::new(f).parent().map(|p| p.display().to_string())
        }).or(directory);

        let _ = app.emit("scan-progress", ScanProgress {
            phase,
            phase_number,
            total_phases,
            files_found: found,
            files_processed: processed,
            bytes_processed: bytes,
            current_file: file,
            current_directory,
            elapsed_ms,
            files_per_second,
            estimated_remaining_ms,
        });
    }

    fn discover_files(
        &self,
        root: &Path,
        app: &AppHandle,
        counter: &AtomicU64,
        bytes_counter: &AtomicU64,
        start_time: &Instant,
    ) -> Vec<FileInfo> {
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
                let total_bytes = bytes_counter.fetch_add(size, Ordering::Relaxed);

                if count.is_multiple_of(500) {
                    self.emit_enhanced_progress(
                        app,
                        ScanPhase::Discovering,
                        1, 4,
                        count,
                        count,
                        total_bytes,
                        Some(entry.path().display().to_string()),
                        entry.path().parent().map(|p| p.display().to_string()),
                        start_time,
                    );
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
}

impl Default for FileScanner {
    fn default() -> Self {
        Self::new()
    }
}
