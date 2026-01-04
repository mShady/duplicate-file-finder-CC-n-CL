# Windows setup script
Write-Host "Setting up development environment for Windows..."

# Check for winget
if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Host "Please install Windows Package Manager (winget) first"
    exit 1
}

# Install Rust
if (!(Get-Command rustc -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Rust..."
    winget install Rustlang.Rust.MSVC
}

# Install Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Node.js..."
    winget install OpenJS.NodeJS.LTS
}

# Install Visual Studio Build Tools (required for Rust on Windows)
Write-Host "Installing Visual Studio Build Tools..."
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools"

Write-Host "Installing npm dependencies..."
npm install

Write-Host "Setup complete! Run 'npm run tauri dev' to start development."
