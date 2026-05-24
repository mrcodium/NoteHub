import * as cheerio from "cheerio";

/**
 * Converts a note's HTML content back into clean, readable Markdown for LLMs.
 * @param {string} html - HTML content of a note
 * @returns {string} Clean Markdown
 */
export function htmlToMarkdown(html) {
  if (!html || typeof html !== "string") return "";

  // Load HTML using cheerio
  const $ = cheerio.load(html);

  // 1. Convert headers
  $("h1, h2, h3, h4, h5, h6").each(function () {
    const level = parseInt(this.tagName.substring(1), 10);
    const prefix = "#".repeat(level);
    $(this).replaceWith(`\n\n${prefix} ${$(this).text().trim()}\n\n`);
  });

  // 2. Convert strong / bold
  $("strong, b").each(function () {
    $(this).replaceWith(`**${$(this).text().trim()}**`);
  });

  // 3. Convert emphasis / italic
  $("em, i").each(function () {
    $(this).replaceWith(`*${$(this).text().trim()}*`);
  });

  // 4. Convert block code blocks first to prevent inner code conversions
  $("pre").each(function () {
    const codeBlock = $(this).find("code");
    const code = codeBlock.length ? codeBlock.text() : $(this).text();
    
    // Find language from class (e.g. language-javascript)
    let lang = "";
    const cls = codeBlock.attr("class") || $(this).attr("class") || "";
    const match = cls.match(/language-(\w+)/);
    if (match) lang = match[1];

    $(this).replaceWith(`\n\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`);
  });

  // 5. Convert inline code (that weren't inside <pre>)
  $("code").each(function () {
    $(this).replaceWith(`\`${$(this).text()}\``);
  });

  // 6. Convert lists (ul)
  $("ul").each(function () {
    let listItems = "";
    $(this).find("> li").each(function () {
      listItems += `* ${$(this).text().trim()}\n`;
    });
    $(this).replaceWith(`\n\n${listItems}\n\n`);
  });

  // 7. Convert ordered lists (ol)
  $("ol").each(function () {
    let listItems = "";
    let i = 1;
    $(this).find("> li").each(function () {
      listItems += `${i++}. ${$(this).text().trim()}\n`;
    });
    $(this).replaceWith(`\n\n${listItems}\n\n`);
  });

  // 8. Convert blockquotes
  $("blockquote").each(function () {
    const lines = $(this).text().trim().split("\n").map(l => `> ${l}`).join("\n");
    $(this).replaceWith(`\n\n${lines}\n\n`);
  });

  // 9. Convert links
  $("a").each(function () {
    const href = $(this).attr("href") || "";
    const text = $(this).text().trim();
    if (href) {
      $(this).replaceWith(`[${text}](${href})`);
    } else {
      $(this).replaceWith(text);
    }
  });

  // 10. Convert paragraphs
  $("p").each(function () {
    $(this).replaceWith(`\n\n${$(this).text().trim()}\n\n`);
  });

  // 11. Handle line breaks
  $("br").replaceWith("\n");

  // Get the final converted body text
  let text = $.text();

  // Normalize newlines and clean up excess spacing
  text = text.replace(/\r\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n"); // Collapse 3+ newlines to double newlines
  
  return text.trim();
}
