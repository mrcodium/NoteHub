import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatTime = (isoString) => {
  const date = new Date(isoString);

  // Get time components
  let hours = date.getUTCHours();
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";

  // Convert hours to 12-hour format
  hours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
  const formattedHours = hours.toString().padStart(2, "0");
  const formattedTime = `${formattedHours}:${minutes} ${ampm}`;
  return formattedTime;
};

// Time formatter
export const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval}${unit.charAt(0)} ago`;
    }
  }
  return "Just now";
};

export const formatDate = (isoString) => {
  const date = new Date(isoString);

  // Get date components
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = date.getUTCFullYear();

  // Construct date and time strings
  const formattedDate = `${day}-${month}-${year}`;

  return formattedDate;
};

export const formatDeviceInfo = (device) => {
  if (!device) return "Unknown device";
  return `${device.browser?.name || "Unknown browser"} on ${
    device.os?.name || "Unknown OS"
  }`;
};

export const formatLocation = (location) => {
  if (!location) return "Unknown location";
  return `${location.city || ""}${
    location.city && location.country ? ", " : ""
  }${location.country || ""}`;
};

export const formatCompactNumber = (num) => {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}b`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}m`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}k`;
  } else {
    return num.toString();
  }
};

export const noteTransformer = (htmlContent, options = {}) => {
  if (!htmlContent || typeof htmlContent !== "string") {
    return {
      headings: [],
      images: [],
      description: "",
    };
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const result = {
      headings: [],
      images: [],
      description: "",
    };

    // Extract headings
    if (options.headings) {
      const headingElements = doc.querySelectorAll("h1, h2, h3, h4, h5, h6");
      result.headings = Array.from(headingElements)
        .map((heading) => ({
          text: heading.textContent.trim(),
          level: parseInt(heading.tagName.substring(1)),
          id: heading.id || null,
        }))
        .filter((h) => h.text.length > 0);
    }

    // Extract images
    if (options.images) {
      const imgElements = doc.querySelectorAll("img[src]");
      result.images = Array.from(imgElements)
        .map((img) => ({
          src: img.src,
          alt: img.alt?.trim() || "",
          width: img.naturalWidth || null,
          height: img.naturalHeight || null,
        }))
        .filter((img) => img.src);
    }

    // Enhanced paragraph extraction
    if (options.description) {
      // Get all text-containing elements
      const textElements = Array.from(
        doc.querySelectorAll("p, div, section, article")
      )
        .map((el) => el.textContent.trim())
        .filter((text) => text.length > 0);

      // Find the best candidate text
      let bestText = "";
      let maxWordCount = 0;

      for (const text of textElements) {
        const words = text.split(/\s+/);
        const wordCount = words.length;

        // If we find text with ≥20 words, use it immediately
        if (wordCount >= 20) {
          bestText = words.slice(0, 20).join(" "); // Take first 20 words
          break;
        }

        // Otherwise track the longest text found
        if (wordCount > maxWordCount) {
          maxWordCount = wordCount;
          bestText = text;
        }
      }

      // Fallback to first heading if no text found
      if (!bestText && result.headings.length > 0) {
        bestText = result.headings[0].text;
      }

      result.description = bestText;
    }

    return result;
  } catch (error) {
    console.error("Error transforming note content:", error);
    return {
      headings: [],
      images: [],
      description: "",
    };
  }
};

export const noteToArticle = (note) => {
  // Ensure content exists before transforming
  const content = note.content || "";
  const transformed = noteTransformer(content, {
    headings: true,
    images: true,
    description: true, // Changed from longDescription to match the transformer
  });

  // Get the best available description
  let description = "";
  if (transformed.description) {
    description = transformed.description;
  } else if (note.name) {
    description = note.name; // Fallback to note name
  }

  return {
    ...note,
    article: {
      ...transformed,
      description,
      // Ensure images array exists even if empty
      images: transformed.images || [],
    },
  };
};

/**
 * Basic fuzzy match + scoring
 * Returns -1 if no match
 */
export function fuzzyScore(query, target) {
  query = query.toLowerCase();
  target = target.toLowerCase();

  let score = 0;
  let qIndex = 0;
  let tIndex = 0;
  let consecutive = 0;

  while (qIndex < query.length && tIndex < target.length) {
    if (query[qIndex] === target[tIndex]) {
      qIndex++;
      consecutive++;
      score += 10 + consecutive * 5; // reward consecutive matches
    } else {
      consecutive = 0;
      score -= 1; // small penalty for gaps
    }
    tIndex++;
  }

  if (qIndex !== query.length) return -1; // not all chars matched

  // bonus for prefix match
  if (target.startsWith(query)) score += 20;

  return score;
}

/**
 * Fuzzy filter & sort
 */
export function fuzzyFilter(query, items, key = "label") {
  if (!query) return items;

  return items
    .map((item) => ({
      item,
      score: fuzzyScore(query, item[key]),
    }))
    .filter((result) => result.score > -1)
    .sort((a, b) => b.score - a.score)
    .map((result) => result.item);
}
