export const API_BASE_URL = (() => {
  const override = new URLSearchParams(window.location.search).get("api");
  if (override) return override.replace(/\/$/, "");
  if (window.location.port === "5173") return "http://localhost:8000";
  return "";
})();
