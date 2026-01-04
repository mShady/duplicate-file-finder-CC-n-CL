use crate::scanner::{FileScanner, ScanResult};
use crate::trash_manager::TrashManager;
use std::path::PathBuf;
use tauri::AppHandle;

#[tauri::command]
pub async fn start_scan(paths: Vec<String>, app: AppHandle) -> Result<ScanResult, String> {
    let paths: Vec<PathBuf> = paths.into_iter().map(PathBuf::from).collect();
    let scanner = FileScanner::new();

    tokio::task::spawn_blocking(move || scanner.scan(paths, app))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn delete_files(paths: Vec<String>) -> Result<DeleteResult, String> {
    let paths: Vec<PathBuf> = paths.into_iter().map(PathBuf::from).collect();
    let deleted = TrashManager::delete_files(paths)?;

    Ok(DeleteResult {
        deleted_count: deleted.len(),
        trash_location: TrashManager::get_trash_location(),
    })
}

#[tauri::command]
pub fn get_trash_location() -> String {
    TrashManager::get_trash_location()
}

#[derive(serde::Serialize)]
pub struct DeleteResult {
    pub deleted_count: usize,
    pub trash_location: String,
}
