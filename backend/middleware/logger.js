import morgan from "morgan";

// Custom token: response body (for debugging)
morgan.token("body", (req) => {
  const b = req.body;
  if (!b || !Object.keys(b).length) return "-";
  // mask sensitive fields
  const safe = { ...b };
  if (safe.password) safe.password = "***";
  if (safe.token) safe.token = "***";
  return JSON.stringify(safe);
});

morgan.token("res-body", (req, res) => res.locals.responseBody || "-");

// Color by status
morgan.token("colored-status", (req, res) => {
  const s = res.statusCode;
  const color =
    s >= 500 ? "\x1b[31m" : // red
    s >= 400 ? "\x1b[33m" : // yellow
    s >= 300 ? "\x1b[36m" : // cyan
    s >= 200 ? "\x1b[32m" : // green
    "\x1b[0m";
  return `${color}${s}\x1b[0m`;
});

morgan.token("colored-method", (req) => {
  const m = req.method;
  const color =
    m === "GET"    ? "\x1b[34m" : // blue
    m === "POST"   ? "\x1b[32m" : // green
    m === "PUT"    ? "\x1b[33m" : // yellow
    m === "PATCH"  ? "\x1b[35m" : // magenta
    m === "DELETE" ? "\x1b[31m" : // red
    "\x1b[0m";
  return `${color}${m}\x1b[0m`;
});

export const requestLogger = morgan(
  "\n:colored-method :url\n  status  : :colored-status\n  time    : :response-time ms\n  body    : :body\n  res     : :res-body\n"
);

// intercept res.json to capture response body
export const captureResponse = (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    res.locals.responseBody = JSON.stringify(body)?.slice(0, 200); // trim long responses
    return originalJson(body);
  };
  next();
};
