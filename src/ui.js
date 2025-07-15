console.log("ui.js loaded");

export function showError(message) {
  alert(`Error: ${message}`);
}

export function showLoader() {
  let loader = document.getElementById("loader");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "loader";
    loader.style.position = "fixed";
    loader.style.top = "50%";
    loader.style.left = "50%";
    loader.style.transform = "translate(-50%, -50%)";
    loader.style.border = "16px solid #f3f3f3";
    loader.style.borderTop = "16px solid #3498db";
    loader.style.borderRadius = "50%";
    loader.style.width = "120px";
    loader.style.height = "120px";
    loader.style.animation = "spin 2s linear infinite";
    document.body.appendChild(loader);

    const keyframes = `@keyframes spin { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }`;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = keyframes;
    document.head.appendChild(styleSheet);
  }
  loader.style.display = "block";
}

export function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) {
    loader.style.display = "none";
  }
}
