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

export function normalizeEmail(email, options = {}) {
  // Default options
  const opts = {
    all_lowercase: true,
    gmail_lowercase: true,
    gmail_remove_dots: true,
    gmail_remove_subaddress: true,
    gmail_convert_googlemaildotcom: true,
    outlookdotcom_lowercase: true,
    outlookdotcom_remove_subaddress: true,
    yahoo_lowercase: true,
    yahoo_remove_subaddress: true,
    icloud_lowercase: true,
    icloud_remove_subaddress: true,
    ...options,
  };

  // Basic validation
  if (typeof email !== "string" || !email) {
    return false;
  }

  const rawEmail = email.trim();
  const parts = rawEmail.split("@");

  // Must have exactly one @ symbol
  if (parts.length !== 2) {
    return false;
  }

  let [localPart, domain] = parts;

  // Domain and local part must exist
  if (!localPart || !domain) {
    return false;
  }

  // Lowercase domain if all_lowercase is enabled
  if (
    opts.all_lowercase ||
    opts.gmail_lowercase ||
    opts.outlookdotcom_lowercase ||
    opts.yahoo_lowercase ||
    opts.icloud_lowercase
  ) {
    domain = domain.toLowerCase();
  }

  // Gmail normalization
  if (domain === "gmail.com" || domain === "googlemail.com") {
    if (opts.gmail_remove_subaddress) {
      localPart = localPart.split("+")[0];
    }
    if (opts.gmail_remove_dots) {
      localPart = localPart.replace(/\./g, "");
    }
    if (opts.gmail_lowercase || opts.all_lowercase) {
      localPart = localPart.toLowerCase();
    }
    if (opts.gmail_convert_googlemaildotcom && domain === "googlemail.com") {
      domain = "gmail.com";
    }
  }
  // Outlook normalization
  else if (
    domain === "outlook.com" ||
    domain === "hotmail.com" ||
    domain === "live.com" ||
    domain === "msn.com"
  ) {
    if (opts.outlookdotcom_remove_subaddress) {
      localPart = localPart.split("+")[0];
    }
    if (opts.outlookdotcom_lowercase || opts.all_lowercase) {
      localPart = localPart.toLowerCase();
    }
  }
  // Yahoo normalization
  else if (
    domain === "yahoo.com" ||
    domain === "ymail.com" ||
    domain === "rocketmail.com"
  ) {
    if (opts.yahoo_remove_subaddress) {
      localPart = localPart.split("-")[0];
    }
    if (opts.yahoo_lowercase || opts.all_lowercase) {
      localPart = localPart.toLowerCase();
    }
  }
  // iCloud normalization
  else if (domain === "icloud.com" || domain === "me.com") {
    if (opts.icloud_remove_subaddress) {
      localPart = localPart.split("+")[0];
    }
    if (opts.icloud_lowercase || opts.all_lowercase) {
      localPart = localPart.toLowerCase();
    }
  }
  // Other domains
  else if (opts.all_lowercase) {
    localPart = localPart.toLowerCase();
  }

  return `${localPart}@${domain}`;
}
