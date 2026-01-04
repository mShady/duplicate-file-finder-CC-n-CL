#!/bin/bash
set -e

echo "Setting up development environment for macOS..."

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Rust
if ! command -v rustc &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

# Install Node.js via nvm
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    brew install node@22
fi

# Install project dependencies
echo "Installing npm dependencies..."
npm install

echo "Setup complete! Run 'make dev' to start development."
