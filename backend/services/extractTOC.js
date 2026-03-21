/**
 * extractTOC.js
 * Parses HTML content and returns a flat tableOfContent array.
 * Works for both the migration script and the Mongoose pre-save hook.
 */

/**
 * Converts heading text to a URL-friendly slug.
 * Strips HTML tags and emoji, then slugifies.
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  return text
    .replace(/<[^>]+>/g, "") // strip any inline HTML tags
    .replace(/[^\p{L}\p{N}\s-]/gu, "") // remove emoji & special chars (unicode-aware)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens
}

/**
 * Adds IDs to headings in HTML content and returns both modified HTML and TOC
 * @param {string} html - The note's content field (HTML string)
 * @returns {{ html: string, toc: Array<{ id: string, text: string, level: number, order: number }> }}
 */
export function extractTOCAndAddIds(html) {
  if (!html || typeof html !== "string") return { html, toc: [] };

  const headingRegex = /<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;
  const toc = [];
  const idCount = {}; // tracks duplicate slugs
  let order = 0;
  let modifiedHtml = html;
  let offset = 0; // track position changes as we insert IDs

  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const existingAttrs = match[2]; // existing attributes like class, style
    const innerContent = match[3];

    // Strip inner tags to get plain text
    const rawText = innerContent.replace(/<[^>]+>/g, "").trim();
    if (!rawText) continue;

    const baseSlug = slugify(rawText) || `heading-${order}`;

    // Deduplicate IDs
    let id;
    if (!idCount[baseSlug]) {
      idCount[baseSlug] = 1;
      id = baseSlug;
    } else {
      idCount[baseSlug] += 1;
      id = `${baseSlug}-${idCount[baseSlug]}`;
    }

    // REPLACE WITH:
    const originalTag = match[0];
    // Remove ALL existing id and data-toc-id attributes, then inject fresh slug id
    const cleanedAttrs = existingAttrs
      .replace(/\s*\bid\s*=\s*["'][^"']*["']/g, "")
      .replace(/\s*\bdata-toc-id\s*=\s*["'][^"']*["']/g, "");

    const newTag = `<h${level}${cleanedAttrs} id="${id}" data-toc-id="${id}">${innerContent}</h${level}>`;

    const matchIndex = match.index + offset;
    modifiedHtml =
      modifiedHtml.slice(0, matchIndex) +
      newTag +
      modifiedHtml.slice(matchIndex + originalTag.length);

    offset += newTag.length - originalTag.length;

    toc.push({
      id,
      text: rawText,
      level,
      order: order++,
    });
  }

  return { html: modifiedHtml, toc };
}

/**
 * Legacy function - only extracts TOC without modifying HTML
 * @param {string} html
 * @returns {Array}
 */
export function extractTOC(html) {
  const { toc } = extractTOCAndAddIds(html);
  return toc;
}
