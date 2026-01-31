export function isEmail(email) {
  if (typeof email !== "string") return false;

  // Basic RFC 5322 compliant regex
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function escape(string) {
  if (typeof string !== "string") return "";

  return string
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isEmpty(value) {
  if (value == null) return true; // null or undefined
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

export function isNumeric(value) {
  return !isNaN(value) && !isNaN(parseFloat(value));
}

export function isLength(str, { min = 0, max = Infinity } = {}) {
  if (typeof str !== "string") return false;

  const length = str.length;
  return length >= min && length <= max;
}
