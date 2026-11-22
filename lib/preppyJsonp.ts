// JSONP GET. Apps Script sends no CORS headers, so the residential widget
// reads ok / slot_taken through a script tag callback. Storefront uses the
// same request shape.

export function preppyJsonp(url: string, timeoutMs = 12000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      reject(new Error("no-window"));
      return;
    }
    const cb = "__preppySched_" + Math.random().toString(36).slice(2);
    const sep = url.includes("?") ? "&" : "?";
    const script = document.createElement("script");
    let settled = false;
    const cleanup = () => {
      try {
        delete (window as any)[cb];
      } catch {
        /* ignore */
      }
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("timeout"));
    }, timeoutMs);
    (window as any)[cb] = (data: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      reject(new Error("script-error"));
    };
    script.src = url + sep + "callback=" + cb + "&_=" + Date.now();
    document.body.appendChild(script);
  });
}

export function bookFailureReason(err: unknown): "timeout" | "script-error" | "not-ok" {
  const message = err instanceof Error ? err.message : "";
  switch (message) {
    case "timeout":
      return "timeout";
    case "script-error":
      return "script-error";
    default:
      return "not-ok";
  }
}
