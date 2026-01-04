.PHONY: dev build test lint clean

# Development
dev:
	npm run tauri dev

# Build for production
build:
	npm run tauri build

# Run tests
test:
	cd src-tauri && cargo test
	npm test

# Lint all code
lint:
	cd src-tauri && cargo clippy -- -D warnings
	npm run lint

# Clean build artifacts
clean:
	cd src-tauri && cargo clean
	rm -rf node_modules dist
