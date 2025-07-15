#!/bin/bash

# Production build script for WebAssembly triangulation module
# This script can work with separate repositories by accepting the source path as parameter

set -e

# Function to show usage
show_usage() {
    echo "Usage: $0 [LIBTRIANGULATION_SOURCE_PATH]"
    echo ""
    echo "Build WebAssembly triangulation module for production deployment."
    echo ""
    echo "Arguments:"
    echo "  LIBTRIANGULATION_SOURCE_PATH  Path to libtriangulation source code"
    echo ""
    echo "Environment variables:"
    echo "  LIBTRIANGULATION_PATH         Alternative way to specify source path"
    echo ""
    echo "Examples:"
    echo "  $0 /path/to/libtriangulation"
    echo "  LIBTRIANGULATION_PATH=/path/to/libtriangulation $0"
    echo "  $0 ../libtriangulation  # for local development"
    echo ""
    exit 1
}

echo "Building WebAssembly triangulation module for production..."

# Check if Emscripten is available
if ! command -v emcmake &> /dev/null; then
    echo "Error: emcmake not found. Please install and source the Emscripten SDK."
    echo "On Ubuntu/Debian: sudo apt install emscripten"
    echo "Or download from: https://emscripten.org/docs/getting_started/downloads.html"
    echo "Make sure to source emsdk_env.sh"
    exit 1
fi

# Determine source path
LIBTRI_PATH=""

if [ $# -eq 1 ]; then
    LIBTRI_PATH="$1"
elif [ -n "$LIBTRIANGULATION_PATH" ]; then
    LIBTRI_PATH="$LIBTRIANGULATION_PATH"
elif [ -d "../libtriangulation" ]; then
    LIBTRI_PATH="../libtriangulation"
    echo "Info: Using default path ../libtriangulation"
else
    echo "Error: libtriangulation source path not specified."
    echo ""
    show_usage
fi

# Convert to absolute path and validate
LIBTRI_PATH="$(cd "$LIBTRI_PATH" 2>/dev/null && pwd)" || {
    echo "Error: libtriangulation directory not found at '$1'"
    echo "Please ensure the libtriangulation source code is available."
    exit 1
}

echo "Using libtriangulation source at: $LIBTRI_PATH"

# Create wasm directory if it doesn't exist
mkdir -p wasm

# Create temporary build directory
BUILD_DIR="wasm/build_temp"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

echo "Configuring build..."

# Configure and build
cd "$BUILD_DIR"
emcmake cmake "$LIBTRI_PATH" -DBUILD_WASM=ON -DCMAKE_BUILD_TYPE=Release
echo "Building..."
make -j$(nproc 2>/dev/null || echo 4)

echo "Copying built files..."

# Copy the generated files to the wasm directory
if [ -f "liblibtriangulation.js" ]; then
    cp liblibtriangulation.js ../libtriangulation.js
    echo "✓ Copied liblibtriangulation.js -> libtriangulation.js"
else
    echo "Error: liblibtriangulation.js not found"
    exit 1
fi

# Check for .wasm file (might be embedded in .js for some builds)
if [ -f "liblibtriangulation.wasm" ]; then
    cp liblibtriangulation.wasm ../libtriangulation.wasm
    echo "✓ Copied liblibtriangulation.wasm -> libtriangulation.wasm"
elif [ -f "libtriangulation.wasm" ]; then
    cp libtriangulation.wasm ../
    echo "✓ Copied libtriangulation.wasm"
else
    echo "ℹ No .wasm file found (binary may be embedded in .js file)"
fi

# Clean up temporary build directory
cd ../..
rm -rf "$BUILD_DIR"

echo ""
echo "✅ WebAssembly module built successfully!"
echo ""
echo "Generated files:"
ls -la wasm/
echo ""
echo "The frontend can now use WASM triangulation." 