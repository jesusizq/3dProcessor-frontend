import { Notyf } from "../node_modules/notyf/notyf.es.js";
import { subscribe, EVENTS } from "./events.js";

// Initialize Notyf with custom configuration
const notyf = new Notyf({
  duration: 4000,
  position: {
    x: "right",
    y: "top",
  },
  types: [
    {
      type: "warning",
      background: "orange",
      icon: {
        className: "fas fa-exclamation-triangle",
        tagName: "i",
        color: "white",
      },
    },
  ],
});

export function showNotification(message, type = "info", duration = 4000) {
  switch (type) {
    case "error":
      return notyf.error(message);
    case "success":
      return notyf.success(message);
    case "warning":
      return notyf.open({
        type: "warning",
        message: message,
        duration: duration,
      });
    default:
      return notyf.success(message);
  }
}

export function showError(message) {
  return notyf.error(message);
}

export function showSuccess(message) {
  return notyf.success(message);
}

export function showWarning(message) {
  return notyf.open({
    type: "warning",
    message: message,
    duration: 5000,
  });
}

// Loading System
export function showLoader(message = "Processing...") {
  const overlay = getLoadingOverlay();
  const loadingText = overlay.querySelector(".loading-text");
  if (loadingText) {
    loadingText.textContent = message;
  }
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

export function hideLoader() {
  const overlay = getLoadingOverlay();
  overlay.classList.remove("active");
  document.body.style.overflow = "";
}

function getLoadingOverlay() {
  let overlay = document.getElementById("loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "loading-overlay";
    overlay.className = "loading-overlay";
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <p class="loading-text">Processing...</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  return overlay;
}

// Statistics Management
export function updateStatistics(stats) {
  updateStat("points-count", stats.points || 0);
  updateStat("triangles-count", stats.triangles || 0);
  updateStat("process-time", stats.processTime || "-");
  updateStat("method-used", stats.method || "-");
}

export function updateStat(statId, value) {
  const element = document.getElementById(statId);
  if (element) {
    element.style.transform = "scale(1.1)";
    element.style.transition = "transform 0.2s ease-out";

    setTimeout(() => {
      element.textContent = value;
      element.style.transform = "scale(1)";
    }, 100);
  }
}

// Status Management
export function updateTriangulationStatus(status, type = "ready") {
  const statusElement = document.getElementById("triangulation-status");
  if (statusElement) {
    statusElement.textContent = status;
    statusElement.className = `status-indicator ${type}`;

    // Update background color based on type
    statusElement.style.background = getStatusColor(type);
  }
}

function getStatusColor(type) {
  switch (type) {
    case "processing":
      return "var(--warning-500)";
    case "success":
      return "var(--success-500)";
    case "error":
      return "var(--error-500)";
    case "ready":
    default:
      return "var(--success-500)";
  }
}

// Processing Indicators
export function showProcessingIndicator(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (canvas) {
    const container = canvas.closest(".canvas-container");
    if (container) {
      const overlay = container.querySelector(".canvas-overlay");
      if (overlay) {
        const indicator = overlay.querySelector(".processing-indicator");
        if (indicator) {
          indicator.classList.add("active");
          overlay.style.opacity = "1";
          overlay.style.pointerEvents = "auto";
        }
      }
    }
  }
}

export function hideProcessingIndicator(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (canvas) {
    const container = canvas.closest(".canvas-container");
    if (container) {
      const overlay = container.querySelector(".canvas-overlay");
      if (overlay) {
        const indicator = overlay.querySelector(".processing-indicator");
        if (indicator) {
          indicator.classList.remove("active");
          overlay.style.opacity = "";
          overlay.style.pointerEvents = "";
        }
      }
    }
  }
}

export function updateFileUploadState(state, fileName = "") {
  const label = document.querySelector(".file-upload-label");
  const span = label?.querySelector("span");

  if (!label || !span) return;

  switch (state) {
    case "uploading":
      label.style.borderColor = "var(--warning-500)";
      label.style.background = "var(--warning-50)";
      span.textContent = "Processing file...";
      break;
    case "success":
      label.style.borderColor = "var(--success-500)";
      label.style.background = "var(--success-50)";
      span.textContent = `Loaded: ${fileName}`;
      setTimeout(() => resetFileUploadState(), 3000);
      break;
    case "error":
      label.style.borderColor = "var(--error-500)";
      label.style.background = "var(--error-50)";
      span.textContent = "Upload failed";
      setTimeout(() => resetFileUploadState(), 3000);
      break;
    default:
      resetFileUploadState();
  }
}

function resetFileUploadState() {
  const label = document.querySelector(".file-upload-label");
  const span = label?.querySelector("span");

  if (label && span) {
    label.style.borderColor = "";
    label.style.background = "";
    span.textContent = "Upload JSON Points";
  }
}

export function setButtonLoading(buttonId, loading = true, originalText = "") {
  const button = document.getElementById(buttonId);
  if (!button) return;

  if (loading) {
    button.disabled = true;
    button.style.opacity = "0.7";
    button.style.cursor = "not-allowed";

    const icon = button.querySelector("i");
    if (icon) {
      icon.className = "fas fa-spinner fa-spin";
    }

    const span = button.querySelector("span");
    if (span) {
      span.setAttribute("data-original-text", span.textContent);
      span.textContent = "Processing...";
    }
  } else {
    button.disabled = false;
    button.style.opacity = "";
    button.style.cursor = "";

    const span = button.querySelector("span");
    if (span) {
      const originalText =
        span.getAttribute("data-original-text") || originalText;
      if (originalText) {
        span.textContent = originalText;
        span.removeAttribute("data-original-text");
      }
    }

    // Restore original icon based on button ID
    const icon = button.querySelector("i");
    if (icon) {
      if (buttonId === "triangulate-btn") {
        icon.className = "fas fa-server";
      } else if (buttonId === "triangulate-wasm-btn") {
        icon.className = "fas fa-microchip";
      } else if (buttonId === "reset-btn") {
        icon.className = "fas fa-refresh";
      }
    }
  }
}

export function showCanvasInstructions(canvasId, show = true) {
  const canvas = document.getElementById(canvasId);
  if (canvas) {
    const container = canvas.closest(".canvas-container");
    if (container) {
      const overlay = container.querySelector(".canvas-overlay");
      if (overlay) {
        if (show) {
          overlay.style.opacity = "1";
          overlay.style.visibility = "visible";
        } else {
          overlay.style.opacity = "0";
          overlay.style.visibility = "hidden";
        }
      }
    }
  }
}

// Performance Monitoring
let startTime = 0;

export function startTimer() {
  startTime = performance.now();
}

export function getElapsedTime() {
  if (startTime === 0) return "0ms";
  const elapsed = performance.now() - startTime;
  startTime = 0;

  if (elapsed < 1000) {
    return `${Math.round(elapsed)}ms`;
  } else {
    return `${(elapsed / 1000).toFixed(2)}s`;
  }
}

export function initializeEnhancedUI() {
  document.documentElement.style.scrollBehavior = "smooth";

  // Add focus styles for accessibility
  const style = document.createElement("style");
  style.textContent = `
    *:focus-visible {
      outline: 2px solid var(--primary-500);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }
  `;
  document.head.appendChild(style);

  console.log("Enhanced UI initialized successfully");
}

// Set up event subscribers for automatic UI updates
subscribe(EVENTS.TRIANGULATION_COMPLETED, ({ result, method }) => {
  const triangleCount = Math.floor(result.length / 3);
  console.log(
    `Triangulation completed via ${method}: ${triangleCount} triangles`
  );
});

subscribe(EVENTS.DRAWING_STARTED, () => {
  console.log("Drawing started - UI can react to this event");
});

subscribe(EVENTS.DRAWING_COMPLETED, ({ points }) => {
  console.log(`Drawing completed with ${points.length} points`);
});

// Call initialization when the module loads
document.addEventListener("DOMContentLoaded", initializeEnhancedUI);
