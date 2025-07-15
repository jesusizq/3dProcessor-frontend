console.log("renderer.js loaded");

export function clearScene(gl) {
  gl.clearColor(0.9, 0.9, 0.9, 1.0); // Light grey background
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }
  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

export function createShaderProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  return createProgram(gl, vertexShader, fragmentShader);
}

export function createRenderer(
  gl,
  lineVertexSource,
  lineFragmentSource,
  triangleVertexSource,
  triangleFragmentSource
) {
  const lineProgram = createShaderProgram(
    gl,
    lineVertexSource,
    lineFragmentSource
  );
  const triangleProgram = createShaderProgram(
    gl,
    triangleVertexSource,
    triangleFragmentSource
  );

  const linePositionAttr = gl.getAttribLocation(lineProgram, "a_position");
  const lineColorUniform = gl.getUniformLocation(lineProgram, "u_color");
  const lineMatrixUniform = gl.getUniformLocation(lineProgram, "u_matrix");

  const triPositionAttr = gl.getAttribLocation(triangleProgram, "a_position");
  const triColorUniform = gl.getUniformLocation(triangleProgram, "u_color");
  const triMatrixUniform = gl.getUniformLocation(triangleProgram, "u_matrix");

  console.log("Triangle shader attribute/uniform locations:");
  console.log("Position attribute:", triPositionAttr);
  console.log("Color uniform:", triColorUniform);
  console.log("Matrix uniform:", triMatrixUniform);

  const positionBuffer = gl.createBuffer();

  return {
    normalizePoints: (points) => {
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      for (const p of points) {
        minX = Math.min(minX, p[0]);
        maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]);
        maxY = Math.max(maxY, p[1]);
      }

      const scaleX = 2.0 / (maxX - minX);
      const scaleY = 2.0 / (maxY - minY);
      const scale = Math.min(scaleX, scaleY) * 0.9;

      const transX = -(minX + maxX) / 2.0;
      const transY = -(minY + maxY) / 2.0;

      return points.map((p) => [
        (p[0] + transX) * scale,
        (p[1] + transY) * scale,
      ]);
    },
    clear: () => {
      gl.clearColor(0.9, 0.9, 0.9, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    drawPolygon: (points, closed, color, matrix) => {
      // No normalization here, assume points are in clip space

      gl.useProgram(lineProgram);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      const positions = points.flat();
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(positions),
        gl.STATIC_DRAW
      );

      gl.enableVertexAttribArray(linePositionAttr);
      gl.vertexAttribPointer(linePositionAttr, 2, gl.FLOAT, false, 0, 0);

      gl.uniform4fv(lineColorUniform, color);
      gl.uniformMatrix3fv(lineMatrixUniform, false, matrix);

      gl.drawArrays(closed ? gl.LINE_LOOP : gl.LINE_STRIP, 0, points.length);
    },
    drawTriangles: (triangles, points, matrix) => {
      // Points should already be in normalized clip space

      gl.useProgram(triangleProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      // Convert indices to actual vertex positions
      const vertices = [];
      for (let i = 0; i < triangles.length; i += 3) {
        // Each group of 3 indices forms one triangle
        const idx1 = triangles[i];
        const idx2 = triangles[i + 1];
        const idx3 = triangles[i + 2];

        // Add the three vertices of this triangle
        vertices.push(points[idx1][0], points[idx1][1]); // vertex 1
        vertices.push(points[idx2][0], points[idx2][1]); // vertex 2
        vertices.push(points[idx3][0], points[idx3][1]); // vertex 3
      }

      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertices),
        gl.STATIC_DRAW
      );

      gl.enableVertexAttribArray(triPositionAttr);
      gl.vertexAttribPointer(triPositionAttr, 2, gl.FLOAT, false, 0, 0);

      // Green color for triangulated mesh
      gl.uniform4f(triColorUniform, 0.0, 1.0, 0.0, 1.0);
      gl.uniformMatrix3fv(triMatrixUniform, false, matrix);

      console.log(
        "About to draw triangles, vertex count:",
        vertices.length / 2
      );
      // Draw filled triangles
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
    },

    drawTriangleWireframes: (
      triangles,
      points,
      matrix,
      color = [0.0, 1.0, 0.0, 1.0]
    ) => {
      console.log("Drawing triangle wireframes");
      console.log("Points:", points);
      console.log("Triangles (indices):", triangles);
      console.log("Matrix:", matrix);

      if (
        !points ||
        points.length === 0 ||
        !triangles ||
        triangles.length === 0
      ) {
        console.warn(
          "Cannot draw wireframes: invalid points or triangles data"
        );
        return;
      }

      gl.useProgram(lineProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      const lines = [];

      // Convert triangles to lines (each triangle edge)
      for (let i = 0; i < triangles.length; i += 3) {
        const idx1 = triangles[i];
        const idx2 = triangles[i + 1];
        const idx3 = triangles[i + 2];

        // Validate indices
        if (
          idx1 >= points.length ||
          idx2 >= points.length ||
          idx3 >= points.length
        ) {
          console.warn(
            `Invalid triangle indices: [${idx1}, ${idx2}, ${idx3}], points length: ${points.length}`
          );
          continue;
        }

        if (!points[idx1] || !points[idx2] || !points[idx3]) {
          console.warn(
            `Undefined points at indices: [${idx1}, ${idx2}, ${idx3}]`
          );
          continue;
        }

        // Add three edges of the triangle
        lines.push(points[idx1][0], points[idx1][1]); // edge 1 start
        lines.push(points[idx2][0], points[idx2][1]); // edge 1 end

        lines.push(points[idx2][0], points[idx2][1]); // edge 2 start
        lines.push(points[idx3][0], points[idx3][1]); // edge 2 end

        lines.push(points[idx3][0], points[idx3][1]); // edge 3 start
        lines.push(points[idx1][0], points[idx1][1]); // edge 3 end
      }

      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(linePositionAttr);
      gl.vertexAttribPointer(linePositionAttr, 2, gl.FLOAT, false, 0, 0);

      // Use the provided color for triangle edges
      gl.uniform4f(lineColorUniform, color[0], color[1], color[2], color[3]);
      gl.uniformMatrix3fv(lineMatrixUniform, false, matrix);

      gl.drawArrays(gl.LINES, 0, lines.length / 2);
    },
  };
}
