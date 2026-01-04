use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: PathBuf,
    pub size: u64,
    pub quick_hash: Option<String>,  // Hash of first 4KB
    pub full_hash: Option<String>,   // Full file hash
    pub modified: i64,
    pub name: String,
    pub extension: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateGroup {
    pub hash: String,
    pub size: u64,
    pub files: Vec<FileInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgress {
    pub phase: ScanPhase,
    pub files_found: u64,
    pub files_processed: u64,
    pub bytes_processed: u64,
    pub current_file: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ScanPhase {
    Discovering,
    Grouping,
    QuickHashing,  // New phase: hash first 4KB
    FullHashing,   // Only for files that match quick hash
    Complete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub duplicates: Vec<DuplicateGroup>,
    pub total_files: u64,
    pub total_duplicate_size: u64,
    pub scan_duration_ms: u64,
}
