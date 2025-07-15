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

## Technology Stack

- **Pure WebGL**: Custom renderer with vertex/fragment shaders for optimal performance
- **ES6 Modules**: Modern JavaScript architecture with modular design
- **WebAssembly**: C++ triangulation library compiled to WASM for client-side processing
- **Factory Pattern**: Modular renderer architecture supporting different drawing modes
- **Matrix Mathematics**: 2D transformation system for zoom/pan functionality

## Getting Started

### Prerequisites

- Modern web browser with WebGL support
- Local web server (required for ES6 modules and WASM)
- Optional: mesh-processor backend service for server-side triangulation

### Running the Application

1. **Start a local web server** (required for ES6 modules):

   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx http-server -p 8000

   # Using PHP
   php -S localhost:8000
   ```

2. **Open the application**:

   Navigate to `http://localhost:8000` in your web browser.

3. **Optional - Start backend service**:

   For backend triangulation, ensure the mesh-processor service is running:

   ```bash
   # See mesh-processor/README.md for setup instructions
   docker-compose up mesh-processor
   ```

## How to Use

### Drawing Polygons

1. **Interactive Drawing**:

   - Click on the left canvas to start drawing a polygon
   - Each click adds a vertex (shown as red lines while drawing)
   - Complete the polygon by clicking near the first vertex
   - Completed polygons appear in blue

2. **Loading from File**:
   - Click "Choose File" and select a JSON file
   - File format: `[[x1, y1], [x2, y2], [x3, y3], ...]`
   - Example:
     ```json
     [
       [100, 100],
       [200, 100],
       [200, 200],
       [100, 200]
     ]
     ```

### Triangulation

- **Triangulate (Backend)**: Uses the mesh-processor microservice

  - Sends polygon data via HTTP POST to `/triangulate`
  - Handles server-side processing with loading indicators
  - Requires backend service to be running

- **Triangulate (WASM)**: Uses WebAssembly module
  - Processes triangulation entirely in the browser
  - Faster for simple polygons (no network overhead)
  - Works offline once the page is loaded

### Visualization

- **Wireframe Display**: Triangulated results show as green wireframe triangles
- **Debug Information**: Browser console shows detailed processing information:
  - Point coordinates and validation
  - Triangle indices and vertex mappings
  - WebGL rendering status
  - Coordinate transformation details

### Interactive Controls

- **Zoom**: Mouse wheel on either canvas
- **Pan**: Right-click and drag on either canvas
- **Independent Views**: Left and right canvases have separate zoom/pan states
- **Reset**: Clear all data and return to initial state

## Architecture

### File Structure

```
frontend/
├── index.html              # Main HTML structure
├── styles/
│   └── style.css           # Application styling
├── src/
│   ├── main.js             # Application entry point and event handling
│   ├── renderer.js         # WebGL renderer with factory pattern
│   ├── ui.js               # UI utilities (loading, errors)
│   ├── api.js              # Backend communication
│   ├── math.js             # 2D matrix transformation utilities
│   └── shaders/            # WebGL shader programs
│       ├── line.vert       # Line vertex shader
│       ├── line.frag       # Line fragment shader
│       ├── triangle.vert   # Triangle vertex shader
│       └── triangle.frag   # Triangle fragment shader
├── wasm/                   # WebAssembly module
│   ├── libtriangulation.js # WASM JavaScript wrapper
│   └── libtriangulation.wasm # WASM binary (optional)
└── README.md               # This file
```

### Renderer Architecture

The renderer uses a factory pattern with dual shader programs:

- **Line Program**: For drawing polygon outlines and wireframes
- **Triangle Program**: For filled triangles (currently unused, kept for future features)
- **Coordinate System**: Normalized device coordinates (-1 to 1) with matrix transformations
- **Buffer Management**: Single vertex buffer with dynamic data updates

### WebAssembly Integration

The WASM module is built from the C++ `libtriangulation` library:

- **Embind Bindings**: JavaScript/C++ interface using Emscripten embind
- **Memory Management**: Automatic cleanup of WASM objects
- **Type Conversion**: JavaScript arrays ↔ C++ vectors via value_object pattern
- **Error Handling**: Graceful fallback when WASM is unavailable

## WebAssembly Module

### Development Build

If you have access to the `libtriangulation` source code:

```bash
# Using the provided build script
./build-wasm.sh

# Or manual build
cd ../libtriangulation
mkdir build_wasm && cd build_wasm
emcmake cmake .. -DBUILD_WASM=ON
make
cp liblibtriangulation.js ../frontend/wasm/libtriangulation.js
```

### Production Deployment

The WASM module is pre-built and included in the `wasm/` directory:

- `libtriangulation.js` - JavaScript wrapper and WASM binary
- Module is loaded asynchronously with error handling

## Backend Integration

### Mesh Processor API

- **Endpoint**: `POST http://localhost:8080/triangulate`
- **Input**: JSON array of 2D points `[[x1, y1], [x2, y2], ...]`
- **Output**: JSON array of triangulated result indices
- **Error Handling**: Displays user-friendly error messages for network/server issues

### CORS and Development

For local development, ensure the backend service allows CORS from `localhost:8000`.

## Debugging

The application includes comprehensive debug logging:

- **Browser Console**: Detailed information about:

  - Triangulation results and timing
  - Coordinate transformations and validation
  - WebGL rendering pipeline status
  - WASM module loading and execution
  - User interaction events

- **Error Handling**: User-friendly error messages for:
  - Invalid JSON files
  - Backend service unavailability
  - WASM loading failures
  - WebGL context issues

## Browser Compatibility

- **WebGL**: Required (available in all modern browsers)
- **ES6 Modules**: Chrome 61+, Firefox 60+, Safari 11+, Edge 16+
- **WebAssembly**: Chrome 57+, Firefox 52+, Safari 11+, Edge 16+
- **File API**: For JSON file loading (universally supported)

## Performance Considerations

- **WASM vs Backend**: WASM is faster for simple polygons, backend better for complex ones
- **Coordinate Normalization**: Points are normalized to [-1, 1] range for optimal WebGL performance
- **Buffer Management**: Single vertex buffer reused for all drawing operations
- **Matrix Transformations**: Efficient 2D matrix operations for zoom/pan

## Future Enhancements

- Support for polygons with holes
- Additional triangulation algorithms
- 3D visualization capabilities
- Batch processing of multiple polygons
- Export functionality for triangulated meshes
