use std::path::PathBuf;

pub struct TrashManager;

impl TrashManager {
    pub fn delete_files(paths: Vec<PathBuf>) -> Result<Vec<PathBuf>, String> {
        #[cfg(target_os = "macos")]
        {
            Self::delete_files_silent_macos(paths)
        }

        #[cfg(not(target_os = "macos"))]
        {
            Self::delete_files_default(paths)
        }
    }

    /// Default implementation for non-macOS platforms
    fn delete_files_default(paths: Vec<PathBuf>) -> Result<Vec<PathBuf>, String> {
        let mut deleted = Vec::new();
        let mut errors = Vec::new();

        for path in paths {
            match trash::delete(&path) {
                Ok(_) => deleted.push(path),
                Err(e) => errors.push(format!("{}: {}", path.display(), e)),
            }
        }

        if !errors.is_empty() && deleted.is_empty() {
            return Err(errors.join("\n"));
        }

        Ok(deleted)
    }

    /// macOS implementation that mutes alert sounds during batch deletion
    #[cfg(target_os = "macos")]
    fn delete_files_silent_macos(paths: Vec<PathBuf>) -> Result<Vec<PathBuf>, String> {
        // Get current alert volume
        let original_volume = Self::get_alert_volume_macos();

        // Mute alert sounds
        if original_volume.is_some() {
            let _ = Self::set_alert_volume_macos(0);
            // Small delay to ensure setting takes effect
            std::thread::sleep(std::time::Duration::from_millis(50));
        }

        // Perform deletions
        let result = Self::delete_files_default(paths);

        // Restore original volume
        if let Some(vol) = original_volume {
            // Small delay before restoring to ensure all sounds are suppressed
            std::thread::sleep(std::time::Duration::from_millis(50));
            let _ = Self::set_alert_volume_macos(vol);
        }

        result
    }

    #[cfg(target_os = "macos")]
    fn get_alert_volume_macos() -> Option<u8> {
        use std::process::Command;

        let output = Command::new("osascript")
            .arg("-e")
            .arg("get alert volume of (get volume settings)")
            .output()
            .ok()?;

        let volume_str = String::from_utf8(output.stdout).ok()?;
        volume_str.trim().parse().ok()
    }

    #[cfg(target_os = "macos")]
    fn set_alert_volume_macos(volume: u8) -> Result<(), String> {
        use std::process::Command;

        Command::new("osascript")
            .arg("-e")
            .arg(format!("set volume alert volume {}", volume))
            .output()
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn get_trash_location() -> String {
        #[cfg(target_os = "macos")]
        {
            "Finder → Go → Go to Folder → ~/.Trash".to_string()
        }
        #[cfg(target_os = "windows")]
        {
            "Open Recycle Bin from Desktop".to_string()
        }
        #[cfg(not(any(target_os = "macos", target_os = "windows")))]
        {
            "Check your system's trash/recycle bin".to_string()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_trash_location_returns_string() {
        let location = TrashManager::get_trash_location();
        assert!(!location.is_empty());
    }

    #[test]
    fn test_delete_nonexistent_file_returns_error() {
        let paths = vec![PathBuf::from("/nonexistent/file/that/does/not/exist.txt")];
        let result = TrashManager::delete_files(paths);
        assert!(result.is_err());
    }

    #[test]
    fn test_delete_empty_list_returns_empty() {
        let paths: Vec<PathBuf> = vec![];
        let result = TrashManager::delete_files(paths).unwrap();
        assert!(result.is_empty());
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn test_get_alert_volume_returns_value() {
        let volume = TrashManager::get_alert_volume_macos();
        // Should return Some value on macOS
        assert!(volume.is_some());
        // Volume should be in valid range (0-100)
        assert!(volume.unwrap() <= 100);
    }

    #[cfg(target_os = "macos")]
    #[test]
    #[ignore = "Flaky in parallel test environment due to osascript timing; run manually with --ignored"]
    fn test_set_and_restore_alert_volume() {
        use std::thread::sleep;
        use std::time::Duration;

        let original = TrashManager::get_alert_volume_macos().unwrap();

        // Set to a different value
        let test_volume = if original > 50 { 25 } else { 75 };
        TrashManager::set_alert_volume_macos(test_volume).unwrap();

        // Small delay for osascript to take effect
        sleep(Duration::from_millis(200));

        let changed = TrashManager::get_alert_volume_macos().unwrap();
        assert_eq!(changed, test_volume);

        // Restore original
        TrashManager::set_alert_volume_macos(original).unwrap();

        // Small delay for osascript to take effect
        sleep(Duration::from_millis(200));

        let restored = TrashManager::get_alert_volume_macos().unwrap();
        assert_eq!(restored, original);
    }
}
