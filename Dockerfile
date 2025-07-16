# ------------------------------------------------------------------------------
# WASM Builder stage
# ------------------------------------------------------------------------------
    FROM emscripten/emsdk:3.1.51 AS wasm-builder

    # Set working directory
    WORKDIR /build
    
    # Copy libtriangulation source
    COPY libs/libtriangulation /build/libtriangulation
    
    # Build WASM module
    RUN cd libtriangulation && \
        rm -rf build_wasm && \
        mkdir -p build_wasm && cd build_wasm && \
        emcmake cmake .. -DBUILD_WASM=ON -DCMAKE_BUILD_TYPE=Release && \
        make -j$(nproc)
    
    # ------------------------------------------------------------------------------
    # Frontend Builder stage
    # ------------------------------------------------------------------------------
    FROM node:18-alpine AS frontend-builder
    
    # Set working directory
    WORKDIR /app
    
    # Copy package.json and package-lock.json first for better caching
    COPY package*.json ./
    
    # Install npm dependencies
    RUN npm install
    
    # Copy rest of frontend source
    COPY . /app/
    
    # Create wasm directory and copy WASM files
    RUN mkdir -p wasm
    
    # Copy pre-built WASM files if they exist, otherwise copy from wasm-builder
    COPY --from=wasm-builder /build/libtriangulation/build_wasm/libtriangulation.js ./wasm/libtriangulation.js
    COPY --from=wasm-builder /build/libtriangulation/build_wasm/libtriangulation.wasm ./wasm/libtriangulation.wasm
    
    # Verify the build
    RUN ls -la wasm/
    
    # ------------------------------------------------------------------------------
    # Runtime stage - Simple HTTP server
    # ------------------------------------------------------------------------------
    FROM node:18-alpine AS runtime
    
    # Install a simple HTTP server
    RUN npm install -g http-server
    
    # Set working directory
    WORKDIR /app
    
    # Copy built frontend files
    COPY --from=frontend-builder /app /app
    
    # Health check
    HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
        CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1
    
    # Expose port
    EXPOSE 3000
    
    # Start the HTTP server
    CMD ["http-server", ".", "-p", "3000", "--cors"] 