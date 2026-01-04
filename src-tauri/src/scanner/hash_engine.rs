use blake3::Hasher;
use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

const BUFFER_SIZE: usize = 1024 * 1024; // 1MB buffer

pub struct HashEngine;

impl HashEngine {
    pub fn compute_hash(path: &Path) -> Result<String, std::io::Error> {
        let file = File::open(path)?;
        let mut reader = BufReader::with_capacity(BUFFER_SIZE, file);
        let mut hasher = Hasher::new();
        let mut buffer = vec![0u8; BUFFER_SIZE];

        loop {
            let bytes_read = reader.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }

        Ok(hasher.finalize().to_hex().to_string())
    }

    /// Compute partial hash for quick comparison (first + last 4KB)
    pub fn compute_quick_hash(path: &Path, file_size: u64) -> Result<String, std::io::Error> {
        let mut file = File::open(path)?;
        let mut hasher = Hasher::new();
        let mut buffer = vec![0u8; 4096];

        // Read first 4KB
        let bytes_read = std::io::Read::read(&mut file, &mut buffer)?;
        hasher.update(&buffer[..bytes_read]);

        // Read last 4KB if file is large enough
        if file_size > 8192 {
            use std::io::{Seek, SeekFrom};
            file.seek(SeekFrom::End(-4096))?;
            let bytes_read = std::io::Read::read(&mut file, &mut buffer)?;
            hasher.update(&buffer[..bytes_read]);
        }

        Ok(hasher.finalize().to_hex().to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_compute_hash_empty_file() {
        let file = NamedTempFile::new().unwrap();
        let hash = HashEngine::compute_hash(file.path()).unwrap();
        // BLAKE3 hash of empty content
        assert_eq!(hash.len(), 64); // 256 bits = 64 hex chars
    }

    #[test]
    fn test_compute_hash_with_content() {
        let mut file = NamedTempFile::new().unwrap();
        file.write_all(b"Hello, World!").unwrap();
        file.flush().unwrap();

        let hash = HashEngine::compute_hash(file.path()).unwrap();
        assert_eq!(hash.len(), 64);
    }

    #[test]
    fn test_identical_content_same_hash() {
        let mut file1 = NamedTempFile::new().unwrap();
        let mut file2 = NamedTempFile::new().unwrap();

        file1.write_all(b"identical content").unwrap();
        file2.write_all(b"identical content").unwrap();
        file1.flush().unwrap();
        file2.flush().unwrap();

        let hash1 = HashEngine::compute_hash(file1.path()).unwrap();
        let hash2 = HashEngine::compute_hash(file2.path()).unwrap();

        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_different_content_different_hash() {
        let mut file1 = NamedTempFile::new().unwrap();
        let mut file2 = NamedTempFile::new().unwrap();

        file1.write_all(b"content A").unwrap();
        file2.write_all(b"content B").unwrap();
        file1.flush().unwrap();
        file2.flush().unwrap();

        let hash1 = HashEngine::compute_hash(file1.path()).unwrap();
        let hash2 = HashEngine::compute_hash(file2.path()).unwrap();

        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_compute_quick_hash_small_file() {
        let mut file = NamedTempFile::new().unwrap();
        file.write_all(b"small content").unwrap();
        file.flush().unwrap();

        let metadata = std::fs::metadata(file.path()).unwrap();
        let hash = HashEngine::compute_quick_hash(file.path(), metadata.len()).unwrap();
        assert_eq!(hash.len(), 64);
    }

    #[test]
    fn test_compute_quick_hash_large_file() {
        let mut file = NamedTempFile::new().unwrap();
        // Create a file larger than 8KB
        let content = vec![0u8; 16 * 1024];
        file.write_all(&content).unwrap();
        file.flush().unwrap();

        let metadata = std::fs::metadata(file.path()).unwrap();
        let hash = HashEngine::compute_quick_hash(file.path(), metadata.len()).unwrap();
        assert_eq!(hash.len(), 64);
    }

    #[test]
    fn test_nonexistent_file_returns_error() {
        let result = HashEngine::compute_hash(std::path::Path::new("/nonexistent/file.txt"));
        assert!(result.is_err());
    }
}
