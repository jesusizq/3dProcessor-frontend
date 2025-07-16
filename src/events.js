import mitt from "../node_modules/mitt/dist/mitt.mjs";

// Create a global event emitter
export const emitter = mitt();

// Define event types for better organization and type safety
export const EVENTS = {
  // State changes
  DRAWING_STARTED: "drawing:started",
  DRAWING_COMPLETED: "drawing:completed",
  POINTS_UPDATED: "points:updated",

  // Triangulation events
  TRIANGULATION_STARTED: "triangulation:started",
  TRIANGULATION_COMPLETED: "triangulation:completed",
  TRIANGULATION_FAILED: "triangulation:failed",

  // View events
  VIEW_UPDATED: "view:updated",
  ZOOM_CHANGED: "view:zoom-changed",
  PAN_CHANGED: "view:pan-changed",

  // File events
  FILE_LOADED: "file:loaded",
  FILE_ERROR: "file:error",

  // UI events
  RESET_REQUESTED: "ui:reset-requested",
  STATISTICS_UPDATE: "ui:statistics-update",
};

// Helper functions for common event patterns
export const emit = {
  drawingStarted: () => emitter.emit(EVENTS.DRAWING_STARTED),
  drawingCompleted: (points) =>
    emitter.emit(EVENTS.DRAWING_COMPLETED, { points }),
  pointsUpdated: (points) => emitter.emit(EVENTS.POINTS_UPDATED, { points }),

  triangulationStarted: (method) =>
    emitter.emit(EVENTS.TRIANGULATION_STARTED, { method }),
  triangulationCompleted: (result, method, time) =>
    emitter.emit(EVENTS.TRIANGULATION_COMPLETED, { result, method, time }),
  triangulationFailed: (error, method) =>
    emitter.emit(EVENTS.TRIANGULATION_FAILED, { error, method }),

  viewUpdated: (viewState) => emitter.emit(EVENTS.VIEW_UPDATED, { viewState }),

  fileLoaded: (points, fileName) =>
    emitter.emit(EVENTS.FILE_LOADED, { points, fileName }),
  fileError: (error) => emitter.emit(EVENTS.FILE_ERROR, { error }),

  resetRequested: () => emitter.emit(EVENTS.RESET_REQUESTED),
  statisticsUpdate: (stats) =>
    emitter.emit(EVENTS.STATISTICS_UPDATE, { stats }),
};

// Helper function for subscribing with automatic cleanup
export const subscribe = (event, handler) => {
  emitter.on(event, handler);
  return () => emitter.off(event, handler);
};
