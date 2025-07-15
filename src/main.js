import * as renderer from "./renderer.js";
import * as ui from "./ui.js";
import * as api from "./api.js";
import * as math from "./math.js";

async function init() {
  console.log("Application starting...");

  const inputCanvas = document.getElementById("input-canvas");
  const outputCanvas = document.getElementById("output-canvas");

  if (!inputCanvas || !outputCanvas) {
    console.error("Canvas elements not found!");
    return;
  }

  const gl_in = inputCanvas.getContext("webgl");
  const gl_out = outputCanvas.getContext("webgl");

  if (!gl_in || !gl_out) {
    console.error("WebGL not supported!");
    // Here we can implement the fallback to backend as per PLAN.md
    ui.showError(
      "WebGL is not supported in your browser. Some features might not be available."
    );
    return;
  }

  // Load shaders
  const lineVertexShaderSource = await fetch("src/shaders/line.vert").then(
    (res) => res.text()
  );
  const lineFragmentShaderSource = await fetch("src/shaders/line.frag").then(
    (res) => res.text()
  );
  const triangleVertexShaderSource = await fetch(
    "src/shaders/triangle.vert"
  ).then((res) => res.text());
  const triangleFragmentShaderSource = await fetch(
    "src/shaders/triangle.frag"
  ).then((res) => res.text());

  let wasmTriangulator;
  let wasmModule; // Store the module instance
  try {
    // Try to load the WASM module from the frontend/wasm directory
    const createTriangulationModule = (
      await import("../wasm/libtriangulation.js")
    ).default;
    wasmModule = await createTriangulationModule();
    wasmTriangulator = new wasmModule.Triangulator();
    console.log("WASM module loaded and triangulator instantiated.");
  } catch (e) {
    console.error("Error loading WASM module:", e);
    console.log(
      "WASM triangulation will not be available. You can still use backend triangulation."
    );
  }

  // Setup renderers
  const inputRenderer = renderer.createRenderer(
    gl_in,
    lineVertexShaderSource,
    lineFragmentShaderSource,
    triangleVertexShaderSource,
    triangleFragmentShaderSource
  );
  const outputRenderer = renderer.createRenderer(
    gl_out,
    lineVertexShaderSource,
    lineFragmentShaderSource,
    triangleVertexShaderSource,
    triangleFragmentShaderSource
  );

  const state = {
    points: [],
    originalPoints: [],
    isDrawing: false,
    colors: {
      drawing: [1.0, 0.0, 0.0, 1.0], // Red
      finished: [0.0, 0.0, 1.0, 1.0], // Blue
      wasmTriangulation: [0.0, 1.0, 0.0, 1.0], // Green
      backendTriangulation: [0.8, 0.2, 1.0, 1.0], // Purple
    },
    view: {
      input: {
        zoom: 1,
        panX: 0,
        panY: 0,
        matrix: math.createIdentity(),
        isPanning: false,
        lastMouseX: 0,
        lastMouseY: 0,
      },
      output: {
        zoom: 1,
        panX: 0,
        panY: 0,
        matrix: math.createIdentity(),
        isPanning: false,
        lastMouseX: 0,
        lastMouseY: 0,
        lastResult: null,
        triangulationMethod: null, // 'wasm' or 'backend'
      },
    },
  };

  function updateMatrix(viewState) {
    const translation = math.createTranslation(viewState.panX, viewState.panY);
    const scaling = math.createScaling(viewState.zoom, viewState.zoom);
    viewState.matrix = math.multiply(translation, scaling);
  }

  function setupCanvasHandlers(canvas, viewState, drawCallback) {
    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.9 : 1.1;
      viewState.zoom *= delta;
      updateMatrix(viewState);
      drawCallback();
    });

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    canvas.addEventListener("mousedown", (event) => {
      if (event.button === 2) {
        // Right mouse button for panning
        viewState.isPanning = true;
        viewState.lastMouseX = event.clientX;
        viewState.lastMouseY = event.clientY;
      }
    });

    canvas.addEventListener("mousemove", (event) => {
      if (!viewState.isPanning) return;
      const dx = ((event.clientX - viewState.lastMouseX) / canvas.width) * 2;
      const dy = ((event.clientY - viewState.lastMouseY) / canvas.height) * -2;
      viewState.panX += dx;
      viewState.panY += dy;
      viewState.lastMouseX = event.clientX;
      viewState.lastMouseY = event.clientY;
      updateMatrix(viewState);
      drawCallback();
    });

    canvas.addEventListener("mouseup", (event) => {
      if (event.button === 2) {
        viewState.isPanning = false;
      }
    });
    canvas.addEventListener("mouseleave", () => (viewState.isPanning = false));
  }

  function redrawInput() {
    inputRenderer.clear();
    if (state.points.length > 0) {
      const closed = !state.isDrawing;
      const color = closed ? state.colors.finished : state.colors.drawing;
      inputRenderer.drawPolygon(
        state.points,
        closed,
        color,
        state.view.input.matrix
      );
    }
  }

  // This needs to be more robust, we need to store the last triangulation result.
  function redrawOutput() {
    outputRenderer.clear();
    if (state.view.output.lastResult) {
      // Use the appropriate color based on triangulation method
      const color =
        state.view.output.triangulationMethod === "backend"
          ? state.colors.backendTriangulation
          : state.colors.wasmTriangulation;

      outputRenderer.drawTriangleWireframes(
        state.view.output.lastResult,
        state.points,
        state.view.output.matrix,
        color
      );
    } else {
      // Test: Draw a simple triangle to verify the rendering pipeline
      const testPoints = [
        [-0.9, -0.9],
        [0.9, -0.9],
        [0.0, 0.9],
      ];
      const testTriangles = [0, 1, 2]; // Simple triangle indices
      outputRenderer.drawTriangleWireframes(
        testTriangles,
        testPoints,
        math.createIdentity(),
        state.colors.wasmTriangulation // Default to green for test
      );
    }
  }

  setupCanvasHandlers(inputCanvas, state.view.input, redrawInput);
  setupCanvasHandlers(outputCanvas, state.view.output, redrawOutput);

  // Initial clear
  inputRenderer.clear();
  outputRenderer.clear();

  console.log("Renderers initialized.");

  inputCanvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return; // Only draw with left mouse button

    const rect = inputCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const clipX = (x / inputCanvas.width) * 2 - 1;
    const clipY = (y / inputCanvas.height) * -2 + 1;

    if (!state.isDrawing) {
      state.isDrawing = true;
      state.points = [];
      redrawInput();
      redrawOutput();
    }

    if (state.isDrawing && state.points.length > 2) {
      const firstPoint = state.points[0];
      const distance = Math.sqrt(
        Math.pow(clipX - firstPoint[0], 2) + Math.pow(clipY - firstPoint[1], 2)
      );
      if (distance < 0.1) {
        state.isDrawing = false;
        redrawInput();
        return;
      }
    }

    state.points.push([clipX, clipY]);
    redrawInput();
  });

  // Setup event listeners
  const fileInput = document.getElementById("file-input");
  fileInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const points = JSON.parse(e.target.result);
          state.isDrawing = false;
          state.originalPoints = points;
          state.points = inputRenderer.normalizePoints(points);
          outputRenderer.clear();
          redrawInput();
        } catch (error) {
          ui.showError("Failed to parse JSON file.");
          console.error("JSON parsing error:", error);
        }
      };
      reader.readAsText(file);
    }
  });

  const triangulateBtn = document.getElementById("triangulate-btn");
  triangulateBtn.addEventListener("click", async () => {
    if (state.points.length === 0) {
      ui.showError("No polygon loaded.");
      return;
    }

    const pointsToSend =
      state.originalPoints.length > 0 ? state.originalPoints : state.points;

    ui.showLoader();
    try {
      const triangulatedMesh = await api.triangulate(pointsToSend);
      console.log("Triangulated mesh:", triangulatedMesh);
      state.view.output.lastResult = triangulatedMesh; // Store result
      state.view.output.triangulationMethod = "backend"; // Track method
      outputRenderer.clear();
      outputRenderer.drawTriangleWireframes(
        triangulatedMesh,
        state.points,
        state.view.output.matrix,
        state.colors.backendTriangulation
      );
    } catch (error) {
      ui.showError(
        "Triangulation failed. Make sure the mesh-processor service is running."
      );
    } finally {
      ui.hideLoader();
    }
  });

  const triangulateWasmBtn = document.getElementById("triangulate-wasm-btn");
  triangulateWasmBtn.addEventListener("click", () => {
    if (!wasmTriangulator || !wasmModule) {
      ui.showError(
        "WASM module is not loaded. Make sure the WASM files are built and available in the wasm/ directory."
      );
      return;
    }
    if (state.points.length === 0) {
      ui.showError("No polygon loaded.");
      return;
    }

    ui.showLoader();
    setTimeout(() => {
      try {
        // Use the stored module instance
        const polygon = new wasmModule.Polygon();

        // Create points correctly for value_object bindings
        state.points.forEach((p) => {
          const point = { x: p[0], y: p[1] };
          polygon.push_back(point);
        });

        const indices = wasmTriangulator.triangulate(polygon);

        const result = [];
        for (let i = 0; i < indices.size(); i++) {
          result.push(indices.get(i));
        }

        console.log("Triangulated indices via WASM:", result);
        console.log("Current state.points:", state.points);
        console.log("Points range check:");
        state.points.forEach((p, i) => {
          console.log(
            `Point ${i}: [${p[0].toFixed(3)}, ${p[1].toFixed(3)}] (range: ${
              Math.abs(p[0]) <= 1 && Math.abs(p[1]) <= 1 ? "OK" : "OUT_OF_RANGE"
            })`
          );
        });

        state.view.output.lastResult = result; // Store result
        state.view.output.triangulationMethod = "wasm"; // Track method

        outputRenderer.clear();
        // Ensure points are properly normalized for display
        const normalizedPoints = state.points; // Already normalized for drawing
        outputRenderer.drawTriangleWireframes(
          result,
          normalizedPoints,
          state.view.output.matrix,
          state.colors.wasmTriangulation
        );

        polygon.delete();
        indices.delete();
      } catch (error) {
        ui.showError("WASM triangulation failed: " + error.message);
        console.error("WASM Error:", error);
      } finally {
        ui.hideLoader();
      }
    }, 10); // setTimeout to allow UI to update and show loader
  });

  const resetBtn = document.getElementById("reset-btn");
  resetBtn.addEventListener("click", () => {
    state.points = [];
    state.originalPoints = [];
    state.isDrawing = false;
    state.view.input.zoom = 1;
    state.view.input.panX = 0;
    state.view.input.panY = 0;
    updateMatrix(state.view.input);
    state.view.output.zoom = 1;
    state.view.output.panX = 0;
    state.view.output.panY = 0;
    updateMatrix(state.view.output);

    inputRenderer.clear();
    outputRenderer.clear();
  });
}

init();
