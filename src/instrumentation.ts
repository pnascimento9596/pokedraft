import type { Instrumentation } from "next";

// Uncaught server errors (a render, a route handler, the proxy). The message can carry request
// data, so only its name and digest are logged, with the path but not the query.
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const header = request.headers["x-vercel-id"];
  console.error(
    JSON.stringify({
      level: "error",
      where: "onRequestError",
      requestId: (Array.isArray(header) ? header[0] : header) ?? null,
      method: request.method,
      path: request.path.split("?")[0],
      routePath: context.routePath,
      routeType: context.routeType,
      name: err instanceof Error ? err.name : typeof err,
      digest:
        typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : null,
    }),
  );
};
