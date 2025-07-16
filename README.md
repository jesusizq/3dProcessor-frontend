# 3D Processor Frontend

This is the frontend for the 3D Processor application. It's a WebGL-based client for interactive polygon and mesh visualization with both backend and WebAssembly (WASM) triangulation support.

## Features

- **Interactive Polygon Drawing**: Draw polygons directly on the canvas using mouse clicks
- **File Loading**: Load polygons from JSON files containing 2D point arrays
- **Dual Triangulation Support**:
  - **Backend Processing**: Send polygons to the mesh-processor microservice for server-side triangulation
  - **WebAssembly Processing**: Use client-side WASM module for fast, local triangulation
- **Wireframe Visualization**: View triangulated meshes as wireframe structures to understand the triangulation algorithm
- **Interactive Viewer**: Zoom and pan both input and output canvases independently
- **Real-time Processing**: Immediate feedback with loading indicators and error handling

## Tech Stack

- **Pure WebGL**: Custom renderer with vertex/fragment shaders for optimal performance
- **ES6 Modules**: Modern JavaScript architecture with modular design
- **WebAssembly**: C++ triangulation library compiled to WASM for client-side processing
- **Event-Driven Architecture**: Decoupled components using mitt event emitter
- **Professional UI Libraries**:
  - **gl-matrix**: Optimized matrix operations for WebGL transformations
  - **notyf**: Professional notification system with animations and accessibility
  - **mitt**: Lightweight event emitter for component communication

## Getting Started

### Prerequisites

- **Docker** and **Docker Compose** (recommended)
- Modern web browser with WebGL support
- **Node.js and npm** (for dependency management)
- **Update the git submodules** with `git submodule update --init --recursive`

### Standalone Development

If you need to run just the frontend without Docker:

```bash
# Install dependencies first
npm install

# Start a local web server (required for ES6 modules)
npm start
# or manually
python -m http.server 8000

# Open in browser
open http://localhost:8000
```

**Note**: For full functionality, ensure the mesh-processor backend is running.

## How to Use

### Triangulation

- **Triangulate (Backend)**: Uses the mesh-processor microservice

  - Sends polygon data via HTTP POST to `/triangulate`
  - Handles server-side processing with loading indicators
  - Requires backend service to be running

- **Triangulate (WASM)**: Uses WebAssembly module
  - Processes triangulation entirely in the browser
  - Faster for simple polygons (no network overhead)
  - Works offline once the page is loaded

## Architecture

### Renderer Architecture

The renderer uses a factory pattern with dual shader programs:

- **Line Program**: For drawing polygon outlines and wireframes
- **Triangle Program**: For rendering vertex points as small squares
- **Coordinate System**: Normalized device coordinates (-1 to 1) with gl-matrix transformations
- **Buffer Management**: Single vertex buffer with dynamic data updates

### Event-Driven Architecture

The application uses mitt for decoupled component communication:

- **Event Types**: Predefined constants for drawing, triangulation, file loading, and UI events
- **Automatic UI Updates**: Components subscribe to relevant events for reactive updates
- **Better Testability**: Decoupled architecture makes unit testing easier
- **Maintainability**: Clear separation of concerns between components

### WebAssembly Integration

The WASM module is built from the C++ `libtriangulation` library:

- **Embind Bindings**: JavaScript/C++ interface using Emscripten embind
- **Memory Management**: Automatic cleanup of WASM objects
- **Type Conversion**: JavaScript arrays ↔ C++ vectors via value_object pattern
- **Error Handling**: Graceful fallback when WASM is unavailable

## WebAssembly Module Development Build

```bash
# Using the provided build script (requires Emscripten SDK)
bash ./scripts/build-wasm.sh

  # Or run npm script
  npm run build:wasm
```

### Module Loading

The WASM module is loaded asynchronously in the browser:

- `libtriangulation.js` - JavaScript wrapper with embedded or separate WASM
- `libtriangulation.wasm` - WebAssembly binary

## Backend Integration

### Mesh Processor API

- **Endpoint**: `POST http://localhost:8080/triangulate`
- **Input**: JSON array of 2D points `[[x1, y1], [x2, y2], ...]`
- **Output**: JSON array of triangulated result indices

### CORS and Development

For standalone development, the backend service allows CORS from all origins (`*`).

## Performance Considerations

- **WASM vs Backend**: WASM is faster for simple polygons, backend better for complex ones
- **Coordinate Normalization**: Points are normalized to [-1, 1] range for optimal WebGL performance
- **Buffer Management**: Single vertex buffer reused for all drawing operations
- **Optimized Libraries**:
  - **gl-matrix**: High-performance matrix operations optimized for WebGL
  - **mitt**: Lightweight event emitter (200 bytes) for minimal overhead
  - **notyf**: Professional notifications with hardware-accelerated animations
- **Event-Driven Updates**: Reactive UI updates only when state changes, reducing unnecessary renders
