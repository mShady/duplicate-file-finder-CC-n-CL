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
    pub phase_number: u8,           // Current phase (1-4)
    pub total_phases: u8,           // Total phases (4)
    pub files_found: u64,
    pub files_processed: u64,
    pub bytes_processed: u64,       // Actually populate this now
    pub current_file: Option<String>,
    pub current_directory: Option<String>,  // Parent directory being scanned
    pub elapsed_ms: u64,            // Time elapsed since scan start
    pub files_per_second: f64,      // Processing speed
    pub estimated_remaining_ms: Option<u64>, // ETA (when calculable)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_info_serialization() {
        let file_info = FileInfo {
            path: PathBuf::from("/test/path.txt"),
            size: 1024,
            quick_hash: Some("abc123".to_string()),
            full_hash: None,
            modified: 1234567890,
            name: "path.txt".to_string(),
            extension: Some("txt".to_string()),
        };

        let json = serde_json::to_string(&file_info).unwrap();
        let deserialized: FileInfo = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.size, 1024);
        assert_eq!(deserialized.name, "path.txt");
    }

    #[test]
    fn test_duplicate_group_serialization() {
        let group = DuplicateGroup {
            hash: "hash123".to_string(),
            size: 2048,
            files: vec![],
        };

        let json = serde_json::to_string(&group).unwrap();
        let deserialized: DuplicateGroup = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.hash, "hash123");
        assert_eq!(deserialized.size, 2048);
    }

    #[test]
    fn test_scan_phase_serialization() {
        let phases = vec![
            ScanPhase::Discovering,
            ScanPhase::Grouping,
            ScanPhase::QuickHashing,
            ScanPhase::FullHashing,
            ScanPhase::Complete,
        ];

        for phase in phases {
            let json = serde_json::to_string(&phase).unwrap();
            let _: ScanPhase = serde_json::from_str(&json).unwrap();
        }
    }
}
