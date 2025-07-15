console.log("renderer.js loaded - V2");

// Helper to create a shader
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader;
  }
  console.error("Error compiling shader:", gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

// Helper to create a shader program
function createProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    return program;
  }
  console.error("Error linking program:", gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

// Main function to create the renderer instance
export function createRenderer(
  gl,
  lineVertexSource,
  lineFragmentSource,
  triangleVertexSource,
  triangleFragmentSource
) {
  // Create shader programs for lines and triangles
  const lineProgram = createProgram(
    gl,
    createShader(gl, gl.VERTEX_SHADER, lineVertexSource),
    createShader(gl, gl.FRAGMENT_SHADER, lineFragmentSource)
  );
  const triangleProgram = createProgram(
    gl,
    createShader(gl, gl.VERTEX_SHADER, triangleVertexSource),
    createShader(gl, gl.FRAGMENT_SHADER, triangleFragmentSource)
  );

  // Get locations of attributes and uniforms
  const linePositionAttr = gl.getAttribLocation(lineProgram, "a_position");
  const lineColorUniform = gl.getUniformLocation(lineProgram, "u_color");
  const lineMatrixUniform = gl.getUniformLocation(lineProgram, "u_matrix");

  const triPositionAttr = gl.getAttribLocation(triangleProgram, "a_position");
  const triColorUniform = gl.getUniformLocation(triangleProgram, "u_color");
  const triMatrixUniform = gl.getUniformLocation(triangleProgram, "u_matrix");

  // Create a reusable buffer
  const positionBuffer = gl.createBuffer();

  // --- HELPER DRAWING FUNCTIONS ---

  // Helper function to draw points as squares
  const drawPoints = (points, color, matrix) => {
    gl.useProgram(triangleProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const pointSize = 0.03;
    const halfSize = pointSize / 2;

    points.forEach((point) => {
      const vertices = [
        point[0] - halfSize,
        point[1] - halfSize,
        point[0] + halfSize,
        point[1] - halfSize,
        point[0] - halfSize,
        point[1] + halfSize,
        point[0] - halfSize,
        point[1] + halfSize,
        point[0] + halfSize,
        point[1] - halfSize,
        point[0] + halfSize,
        point[1] + halfSize,
      ];
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertices),
        gl.STATIC_DRAW
      );
      gl.enableVertexAttribArray(triPositionAttr);
      gl.vertexAttribPointer(triPositionAttr, 2, gl.FLOAT, false, 0, 0);
      gl.uniform4fv(triColorUniform, color);
      gl.uniformMatrix3fv(triMatrixUniform, false, matrix);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
  };

  // Helper function to draw lines
  const drawLines = (points, closed, color, matrix) => {
    gl.useProgram(lineProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Set line width if supported
    gl.lineWidth(3.0);

    const positions = points.flat();
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(linePositionAttr);
    gl.vertexAttribPointer(linePositionAttr, 2, gl.FLOAT, false, 0, 0);
    gl.uniform4fv(lineColorUniform, color);
    gl.uniformMatrix3fv(lineMatrixUniform, false, matrix);
    gl.drawArrays(closed ? gl.LINE_LOOP : gl.LINE_STRIP, 0, points.length);
  };

  // --- RENDERER API ---

  return {
    // Normalizes points to fit within the -1 to 1 clip space
    normalizePoints: (points) => {
      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
      points.forEach((p) => {
        minX = Math.min(minX, p[0]);
        maxX = Math.max(maxX, p[0]);
        minY = Math.min(minY, p[1]);
        maxY = Math.max(maxY, p[1]);
      });

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

    // Clears the canvas
    clear: () => {
      gl.clearColor(0.9, 0.9, 0.9, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },

    // Draws a polygon with points
    drawPolygon: (points, closed, color, matrix) => {
      if (!points || points.length === 0) return;

      // Draw lines if there's more than one point
      if (points.length > 1) {
        drawLines(points, closed, color, matrix);
      }

      // Always draw the points
      drawPoints(points, color, matrix);
    },

    // Draws the filled triangles of the final mesh
    drawTriangles: (triangles, points, matrix, color) => {
      gl.useProgram(triangleProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      const vertices = [];
      triangles.forEach((index) => {
        vertices.push(points[index][0], points[index][1]);
      });

      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertices),
        gl.STATIC_DRAW
      );
      gl.enableVertexAttribArray(triPositionAttr);
      gl.vertexAttribPointer(triPositionAttr, 2, gl.FLOAT, false, 0, 0);
      gl.uniform4fv(triColorUniform, color);
      gl.uniformMatrix3fv(triMatrixUniform, false, matrix);
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
    },

    // Draws the wireframe of the final mesh
    drawTriangleWireframes: (triangles, points, matrix, color) => {
      if (
        !points ||
        points.length === 0 ||
        !triangles ||
        triangles.length === 0
      ) {
        return;
      }

      const lines = [];
      for (let i = 0; i < triangles.length; i += 3) {
        const p1 = points[triangles[i]];
        const p2 = points[triangles[i + 1]];
        const p3 = points[triangles[i + 2]];
        if (p1 && p2 && p3) {
          lines.push(p1[0], p1[1], p2[0], p2[1]);
          lines.push(p2[0], p2[1], p3[0], p3[1]);
          lines.push(p3[0], p3[1], p1[0], p1[1]);
        }
      }

      gl.useProgram(lineProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

      // Set line width if supported
      gl.lineWidth(2.0);

      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lines), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(linePositionAttr);
      gl.vertexAttribPointer(linePositionAttr, 2, gl.FLOAT, false, 0, 0);
      gl.uniform4fv(lineColorUniform, color);
      gl.uniformMatrix3fv(lineMatrixUniform, false, matrix);
      gl.drawArrays(gl.LINES, 0, lines.length / 2);

      // Also draw the points on top of the wireframe
      drawPoints(points, color, matrix);
    },
  };
}
