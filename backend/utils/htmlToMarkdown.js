import * as cheerio from "cheerio";

/**
 * Converts a note's HTML content back into clean, readable Markdown for LLMs.
 * Supports: LaTeX (block $$, inline $), tables, images, code blocks, headings,
 *           bold, italic, lists, blockquotes, links, and horizontal rules.
 *
 * @param {string} html - HTML content of a note
 * @returns {string} Clean Markdown
 */
export function htmlToMarkdown(html) {
  if (!html || typeof html !== "string") return "";

  const $ = cheerio.load(html);

  // ── 0. Block LaTeX math  →  $$...$$ ────────────────────────────────────────
  $("[data-type='block-math']").each(function () {
    const latex = $(this).attr("data-latex") || "";
    $(this).replaceWith(`\n\n$$${latex}$$\n\n`);
  });

  // ── 0b. Inline LaTeX math  →  $...$ ────────────────────────────────────────
  $("[data-type='inline-math']").each(function () {
    const latex = $(this).attr("data-latex") || "";
    $(this).replaceWith(`$${latex}$`);
  });

  // ── 1. Headings ─────────────────────────────────────────────────────────────
  $("h1, h2, h3, h4, h5, h6").each(function () {
    const level = parseInt(this.tagName.substring(1), 10);
    const prefix = "#".repeat(level);
    $(this).replaceWith(`\n\n${prefix} ${$(this).text().trim()}\n\n`);
  });

  // ── 2. Images  →  ![alt](src) ───────────────────────────────────────────────
  $("img").each(function () {
    const src = $(this).attr("src") || "";
    const alt = $(this).attr("alt") || "";
    $(this).replaceWith(src ? `\n\n![${alt}](${src})\n\n` : "");
  });

  // ── 3. Horizontal rules ─────────────────────────────────────────────────────
  $("hr").each(function () {
    $(this).replaceWith("\n\n---\n\n");
  });

  // ── 4. Bold ─────────────────────────────────────────────────────────────────
  $("strong, b").each(function () {
    $(this).replaceWith(`**${$(this).text().trim()}**`);
  });

  // ── 5. Italic ───────────────────────────────────────────────────────────────
  $("em, i").each(function () {
    $(this).replaceWith(`*${$(this).text().trim()}*`);
  });

  // ── 6. Tables (before paragraphs so cell <p> tags are intact) ───────────────
  $("table").each(function () {
    const rows = $(this).find("tr");
    const lines = [];
    rows.each(function (i) {
      const cells = $(this)
        .find("th, td")
        .map(function () {
          return $(this).text().trim().replace(/\|/g, "\\|");
        })
        .get();
      if (!cells.length) return;
      lines.push(`| ${cells.join(" | ")} |`);
      if (i === 0) {
        lines.push(`| ${cells.map(() => "---").join(" | ")} |`);
      }
    });
    $(this).replaceWith(lines.length ? `\n\n${lines.join("\n")}\n\n` : "");
  });

  // ── 7. Code blocks (pre) ────────────────────────────────────────────────────
  $("pre").each(function () {
    const codeBlock = $(this).find("code");
    const code = codeBlock.length ? codeBlock.text() : $(this).text();
    let lang = "";
    const cls = codeBlock.attr("class") || $(this).attr("class") || "";
    const match = cls.match(/language-(\w+)/);
    if (match) lang = match[1];
    $(this).replaceWith(`\n\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`);
  });

  // ── 8. Inline code ──────────────────────────────────────────────────────────
  $("code").each(function () {
    $(this).replaceWith(`\`${$(this).text()}\``);
  });

  // ── 9. Unordered lists ──────────────────────────────────────────────────────
  $("ul").each(function () {
    let listItems = "";
    $(this).find("> li").each(function () {
      listItems += `* ${$(this).text().trim()}\n`;
    });
    $(this).replaceWith(`\n\n${listItems}\n\n`);
  });

  // ── 10. Ordered lists ───────────────────────────────────────────────────────
  $("ol").each(function () {
    let listItems = "";
    let i = 1;
    $(this).find("> li").each(function () {
      listItems += `${i++}. ${$(this).text().trim()}\n`;
    });
    $(this).replaceWith(`\n\n${listItems}\n\n`);
  });

  // ── 11. Blockquotes ─────────────────────────────────────────────────────────
  $("blockquote").each(function () {
    const lines = $(this)
      .text()
      .trim()
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    $(this).replaceWith(`\n\n${lines}\n\n`);
  });

  // ── 12. Links ───────────────────────────────────────────────────────────────
  $("a").each(function () {
    const href = $(this).attr("href") || "";
    const text = $(this).text().trim();
    $(this).replaceWith(href ? `[${text}](${href})` : text);
  });

  // ── 13. Paragraphs ──────────────────────────────────────────────────────────
  $("p").each(function () {
    const text = $(this).text().trim();
    $(this).replaceWith(text ? `\n\n${text}\n\n` : "");
  });

  // ── 14. Line breaks ─────────────────────────────────────────────────────────
  $("br").replaceWith("\n");

  // ── Cleanup ─────────────────────────────────────────────────────────────────
  let text = $.text();
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}
