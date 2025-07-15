#!/bin/bash

# Build script for WebAssembly triangulation module
# This script can be run from the frontend directory to build the WASM module

set -e

echo "Building WebAssembly triangulation module..."

# Check if Emscripten is available
if ! command -v emcmake &> /dev/null; then
    echo "Error: emcmake not found. Please install and source the Emscripten SDK."
    echo "On Ubuntu/Debian: sudo apt install emscripten"
    echo "Or download from: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

# Create wasm directory if it doesn't exist
mkdir -p wasm

# Get the absolute path to libtriangulation
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIBTRI_PATH="$(cd "$SCRIPT_DIR/../libtriangulation" && pwd)"

if [ ! -d "$LIBTRI_PATH" ]; then
    echo "Error: libtriangulation directory not found at $LIBTRI_PATH"
    echo "Please ensure the libtriangulation source code is available."
    exit 1
fi

echo "Using libtriangulation source at: $LIBTRI_PATH"

# Create temporary build directory
BUILD_DIR="wasm/build_temp"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Configure and build
cd "$BUILD_DIR"
emcmake cmake "$LIBTRI_PATH" -DBUILD_WASM=ON
make

# Copy the generated files to the wasm directory
echo "Files in build directory:"
ls -la

if [ -f "libtriangulation.js" ]; then
    cp libtriangulation.js ../
    echo "✓ Copied libtriangulation.js ($(file libtriangulation.js))"
elif [ -f "liblibtriangulation.js" ]; then
    cp liblibtriangulation.js ../libtriangulation.js
    echo "✓ Copied liblibtriangulation.js -> libtriangulation.js ($(file liblibtriangulation.js))"
else
    echo "Error: No JavaScript file found"
    exit 1
fi

# Check for .wasm file
if [ -f "libtriangulation.wasm" ]; then
    cp libtriangulation.wasm ../
    echo "✓ Copied libtriangulation.wasm"
elif [ -f "liblibtriangulation.wasm" ]; then
    cp liblibtriangulation.wasm ../libtriangulation.wasm
    echo "✓ Copied liblibtriangulation.wasm -> libtriangulation.wasm"
else
    echo "ℹ No .wasm file found (binary may be embedded in .js file)"
fi

# Clean up temporary build directory
cd ../..
rm -rf "$BUILD_DIR"

echo "WebAssembly module built successfully!"
echo "Files are available in frontend/wasm/"
ls -la wasm/ 