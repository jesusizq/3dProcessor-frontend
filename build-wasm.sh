#!/bin/bash

# Build script for WebAssembly triangulation module
# This script can be run from the frontend directory to build the WASM module

set -e

echo "Building WebAssembly triangulation module..."

# Function to locate and source emsdk_env.sh
source_emsdk() {
    # Check if emcmake is already in PATH (in case environment is pre-configured)
    if command -v emcmake >/dev/null 2>&1; then
        return 0
    fi

    # Check if EMSDK environment variable is set
    if [ -n "$EMSDK" ] && [ -f "$EMSDK/emsdk_env.sh" ]; then
        . "$EMSDK/emsdk_env.sh"
        if command -v emcmake >/dev/null 2>&1; then
            return 0
        else
            echo "Warning: Sourced $EMSDK/emsdk_env.sh, but emcmake still not found."
        fi
    fi

    # Try common default locations
    for path in "/opt/emsdk" "$HOME/emsdk" "/usr/local/emsdk" "/usr/emsdk"; do
        if [ -f "$path/emsdk_env.sh" ]; then
            . "$path/emsdk_env.sh"
            if command -v emcmake >/dev/null 2>&1; then
                return 0
            else
                echo "Warning: Sourced $path/emsdk_env.sh, but emcmake still not found."
            fi
        fi
    done

    # Fallback: Directly add known Emscripten path to PATH
    if [ -f "/opt/emsdk/upstream/emscripten/emcmake" ]; then
        export PATH="$PATH:/opt/emsdk/upstream/emscripten"
        if command -v emcmake >/dev/null 2>&1; then
            return 0
        fi
    fi

    return 1
}

# Attempt to source Emscripten environment
if ! source_emsdk; then
    echo "Error: Could not locate Emscripten SDK or emcmake."
    exit 1
fi

# Verify emcmake is available
if ! command -v emcmake >/dev/null 2>&1; then
    echo "Error: emcmake not found even after attempting to set up Emscripten SDK."
    echo "Please verify your Emscripten installation and ensure emcmake is in your PATH."
    exit 1
fi

# Debug: Print emcmake location for verification
echo "emcmake found at: $(which emcmake)"

# Create wasm directory if it doesn't exist
mkdir -p wasm

# Get the absolute path to libtriangulation
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIBTRI_PATH="$(cd "$SCRIPT_DIR/libs/libtriangulation" && pwd)"

if [ ! -d "$LIBTRI_PATH" ]; then
    echo "Error: libtriangulation directory not found at $LIBTRI_PATH"
    echo "Please ensure the libtriangulation source code is available as a git submodule."
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
make -j$(nproc)

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