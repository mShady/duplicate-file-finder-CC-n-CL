use std::path::PathBuf;

pub struct TrashManager;

impl TrashManager {
    pub fn delete_files(paths: Vec<PathBuf>) -> Result<Vec<PathBuf>, String> {
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
}
