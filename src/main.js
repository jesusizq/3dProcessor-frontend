import * as renderer from "./renderer.js";
import * as ui from "./ui.js";
import * as api from "./api.js";
import * as math from "./math.js";
// Simple distance calculation function
const calculateDistance = (a, b) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
import { emit, subscribe, EVENTS } from "./events.js";

async function init() {
  console.log("Application starting...");

  const inputCanvas = document.getElementById("input-canvas");
  const outputCanvas = document.getElementById("output-canvas");

  if (!inputCanvas || !outputCanvas) {
    console.error("Canvas elements not found!");
    ui.showError("Critical error: Canvas elements not found!");
    return;
  }

  const gl_in = inputCanvas.getContext("webgl");
  const gl_out = outputCanvas.getContext("webgl");

  if (!gl_in || !gl_out) {
    console.error("WebGL not supported!");
    ui.showWarning(
      "WebGL is not supported in your browser. Some features might not be available."
    );
    return;
  }

  // Load shaders
  ui.showLoader("Loading application resources...");

  try {
    const [
      lineVertexShaderSource,
      lineFragmentShaderSource,
      triangleVertexShaderSource,
      triangleFragmentShaderSource,
    ] = await Promise.all([
      fetch("src/shaders/line.vert").then((res) => res.text()),
      fetch("src/shaders/line.frag").then((res) => res.text()),
      fetch("src/shaders/triangle.vert").then((res) => res.text()),
      fetch("src/shaders/triangle.frag").then((res) => res.text()),
    ]);

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
      ui.showSuccess("WASM module loaded successfully!");
    } catch (e) {
      console.error("Error loading WASM module:", e);
      ui.showWarning(
        "WASM triangulation unavailable. Backend triangulation is still available."
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

    ui.hideLoader();

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
      const translation = math.createTranslation(
        viewState.panX,
        viewState.panY
      );
      const scaling = math.createScaling(viewState.zoom, viewState.zoom);
      viewState.matrix = math.multiply(translation, scaling);
    }

    function updateStatistics() {
      const pointsCount = state.points.length;
      const trianglesCount = state.view.output.lastResult
        ? Math.floor(state.view.output.lastResult.length / 3)
        : 0;

      ui.updateStatistics({
        points: pointsCount,
        triangles: trianglesCount,
        method: state.view.output.triangulationMethod || "-",
      });
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
        const dy =
          ((event.clientY - viewState.lastMouseY) / canvas.height) * -2;
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
      canvas.addEventListener(
        "mouseleave",
        () => (viewState.isPanning = false)
      );
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
      updateStatistics();
    }

    function redrawOutput() {
      outputRenderer.clear();
      if (state.view.output.lastResult) {
        // Use the appropriate color based on triangulation method
        const color =
          state.view.output.triangulationMethod === "backend"
            ? state.colors.backendTriangulation
            : state.colors.wasmTriangulation;

        outputRenderer.drawTriangles(
          state.view.output.lastResult,
          state.points,
          state.view.output.matrix,
          color
        );
      }

      updateStatistics();
    }

    setupCanvasHandlers(inputCanvas, state.view.input, redrawInput);
    setupCanvasHandlers(outputCanvas, state.view.output, redrawOutput);

    inputRenderer.clear();
    outputRenderer.clear();
    updateStatistics();

    ui.showCanvasInstructions("input-canvas", true);

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
        state.view.output.lastResult = null;
        state.view.output.triangulationMethod = null;
        emit.drawingStarted();
        ui.updateTriangulationStatus("Drawing...", "processing");
        // Hide canvas instructions when drawing starts
        ui.showCanvasInstructions("input-canvas", false);
        redrawInput();
        redrawOutput();
      }

      if (state.isDrawing && state.points.length > 2) {
        const firstPoint = state.points[0];
        const currentPoint = [clipX, clipY];
        const dist = calculateDistance(currentPoint, firstPoint);
        if (dist < 0.1) {
          state.isDrawing = false;
          emit.drawingCompleted(state.points);
          ui.updateTriangulationStatus("Ready", "ready");
          ui.showSuccess("Polygon completed! Ready for triangulation.");
          // Don't show instructions again - let user see their completed polygon
          redrawInput();
          return;
        }
      }

      state.points.push([clipX, clipY]);
      emit.pointsUpdated(state.points);
      redrawInput();
    });

    // Setup event listeners
    const fileInput = document.getElementById("file-input");
    fileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        ui.updateFileUploadState("uploading");
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const points = JSON.parse(e.target.result);
            state.isDrawing = false;
            state.originalPoints = points;
            state.points = inputRenderer.normalizePoints(points);
            state.view.output.lastResult = null;
            state.view.output.triangulationMethod = null;

            outputRenderer.clear();
            redrawInput();
            redrawOutput();

            ui.updateFileUploadState("success", file.name);
            ui.updateTriangulationStatus("Ready", "ready");
            ui.showSuccess(`Loaded ${points.length} points from ${file.name}`);
            ui.showCanvasInstructions("input-canvas", false);
            emit.fileLoaded(points, file.name);
          } catch (error) {
            ui.updateFileUploadState("error");
            ui.showError("Failed to parse JSON file. Please check the format.");
            console.error("JSON parsing error:", error);
            emit.fileError(error);
          }
        };
        reader.readAsText(file);
      }
    });

    const triangulateBtn = document.getElementById("triangulate-btn");
    triangulateBtn.addEventListener("click", async () => {
      if (state.points.length === 0) {
        ui.showError("No polygon loaded. Please draw or upload points first.");
        return;
      }

      if (state.points.length < 3) {
        ui.showError("Need at least 3 points to create a polygon.");
        return;
      }

      // Always send normalized coordinates to ensure backend indices match rendering coordinates
      const pointsToSend = state.points;

      ui.setButtonLoading("triangulate-btn", true);
      ui.updateTriangulationStatus("Processing...", "processing");
      ui.startTimer();
      emit.triangulationStarted("backend");

      try {
        const triangulationResult = await api.triangulate(pointsToSend);
        const processingTime = ui.getElapsedTime();

        // Handle both formats: array of indices object with vertices + indices
        let triangulatedMesh, resolvedVertices;
        if (Array.isArray(triangulationResult)) {
          // just indices
          triangulatedMesh = triangulationResult;
          resolvedVertices = state.points;
        } else {
          // object with vertices and indices
          triangulatedMesh = triangulationResult.indices;
          resolvedVertices = triangulationResult.vertices.map((v) => [
            v[0],
            v[1],
          ]);
        }

        // Check for index bounds errors
        for (let i = 0; i < triangulatedMesh.length; i++) {
          if (triangulatedMesh[i] >= resolvedVertices.length) {
            console.error(
              `❌ INDEX OUT OF BOUNDS: Index ${triangulatedMesh[i]} >= vertices length ${resolvedVertices.length}`
            );
          }
        }

        state.view.output.lastResult = triangulatedMesh;
        state.view.output.triangulationMethod = "backend";

        outputRenderer.clear();

        // Use the resolved vertices for rendering
        outputRenderer.drawTriangles(
          triangulatedMesh,
          resolvedVertices,
          state.view.output.matrix,
          state.colors.backendTriangulation
        );

        ui.updateStatistics({
          points: resolvedVertices.length, // Show resolved vertex count
          triangles: Math.floor(triangulatedMesh.length / 3),
          processTime: processingTime,
          method: "Backend API",
        });

        ui.updateTriangulationStatus("Complete", "success");
        ui.showSuccess(`Backend triangulation completed in ${processingTime}`);
        emit.triangulationCompleted(
          triangulatedMesh,
          "backend",
          processingTime
        );
      } catch (error) {
        ui.updateTriangulationStatus("Error", "error");
        ui.showError(
          "Triangulation failed. Make sure the mesh-processor service is running."
        );
        console.error("Backend triangulation error:", error);
        emit.triangulationFailed(error, "backend");
      } finally {
        ui.setButtonLoading("triangulate-btn", false);
      }
    });

    const triangulateWasmBtn = document.getElementById("triangulate-wasm-btn");
    triangulateWasmBtn.addEventListener("click", () => {
      if (!wasmTriangulator || !wasmModule) {
        ui.showError(
          "WASM module is not loaded. Make sure the WASM files are built and available."
        );
        return;
      }

      if (state.points.length === 0) {
        ui.showError("No polygon loaded. Please draw or upload points first.");
        return;
      }

      if (state.points.length < 3) {
        ui.showError("Need at least 3 points to create a polygon.");
        return;
      }

      ui.setButtonLoading("triangulate-wasm-btn", true);
      ui.updateTriangulationStatus("Processing...", "processing");
      ui.startTimer();
      emit.triangulationStarted("wasm");

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

          const processingTime = ui.getElapsedTime();

          console.log("Triangulated indices via WASM:", result);

          state.view.output.lastResult = result;
          state.view.output.triangulationMethod = "wasm";

          outputRenderer.clear();
          // Ensure points are properly normalized for display
          const normalizedPoints = state.points; // Already normalized for drawing
          outputRenderer.drawTriangles(
            result,
            normalizedPoints,
            state.view.output.matrix,
            state.colors.wasmTriangulation
          );

          ui.updateStatistics({
            points: state.points.length,
            triangles: Math.floor(result.length / 3),
            processTime: processingTime,
            method: "WebAssembly",
          });

          ui.updateTriangulationStatus("Complete", "success");
          ui.showSuccess(`WASM triangulation completed in ${processingTime}`);
          emit.triangulationCompleted(result, "wasm", processingTime);

          polygon.delete();
          indices.delete();
        } catch (error) {
          ui.updateTriangulationStatus("Error", "error");
          ui.showError("WASM triangulation failed: " + error.message);
          console.error("WASM Error:", error);
          emit.triangulationFailed(error, "wasm");
        } finally {
          ui.setButtonLoading("triangulate-wasm-btn", false);
        }
      }, 10); // setTimeout to allow UI to update and show loader
    });

    const resetBtn = document.getElementById("reset-btn");
    resetBtn.addEventListener("click", () => {
      emit.resetRequested();
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
      state.view.output.lastResult = null;
      state.view.output.triangulationMethod = null;
      updateMatrix(state.view.output);

      inputRenderer.clear();
      outputRenderer.clear();

      ui.updateTriangulationStatus("Ready", "ready");
      ui.updateStatistics({
        points: 0,
        triangles: 0,
        processTime: "-",
        method: "-",
      });

      ui.updateFileUploadState("default");
      ui.showCanvasInstructions("input-canvas", true);
      ui.showSuccess("Application reset successfully");
    });
  } catch (error) {
    ui.hideLoader();
    console.error("Initialization error:", error);
    ui.showError("Failed to initialize application. Please refresh the page.");
  }
}

init();
