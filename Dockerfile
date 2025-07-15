# ------------------------------------------------------------------------------
# WASM Builder stage
# ------------------------------------------------------------------------------
FROM emscripten/emsdk:3.1.51 AS wasm-builder

# Set working directory
WORKDIR /build

# Copy libtriangulation source
COPY libtriangulation /build/libtriangulation

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

# Copy frontend source
COPY frontend/ /app/

# Create wasm directory and copy WASM files
RUN mkdir -p wasm
COPY --from=wasm-builder /build/libtriangulation/build_wasm/libtriangulation.js ./wasm/libtriangulation.js
COPY --from=wasm-builder /build/libtriangulation/build_wasm/libtriangulation.wasm ./wasm/libtriangulation.wasm

# Install any build dependencies if needed
# RUN npm install  # Uncomment if you add build tools in the future

# Verify the build
RUN ls -la wasm/

# ------------------------------------------------------------------------------
# Nginx stage
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runtime

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy custom nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy frontend files
COPY --from=frontend-builder /app /usr/share/nginx/html

# Create log directory with proper permissions
RUN mkdir -p /var/log/nginx && \
    touch /var/log/nginx/access.log && \
    touch /var/log/nginx/error.log && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /var/log/nginx

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 