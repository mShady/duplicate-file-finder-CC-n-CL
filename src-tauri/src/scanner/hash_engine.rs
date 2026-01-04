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
