// Use environment-aware URL configuration
const MESH_PROCESSOR_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:8080" // Development
    : "/api"; // Production (proxied through nginx)

export async function triangulate(points) {
  try {
    const response = await fetch(`${MESH_PROCESSOR_URL}/triangulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(points),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const triangulatedMesh = await response.json();
    return triangulatedMesh;
  } catch (error) {
    console.error("Error during triangulation request:", error);
    throw error;
  }
}
