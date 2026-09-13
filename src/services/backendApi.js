const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");

export function backendFetch(path, options = {}) {
  return fetch(`${backendUrl}${path}`, {
    ...options,
    credentials: "include",
  });
}
