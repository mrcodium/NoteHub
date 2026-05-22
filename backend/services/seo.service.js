/**
 * Calculates the SEO health score for a blog post/note
 * matching the penalty-based scoring logic on the frontend.
 * 
 * @param {Object} note - The blog note document from the DB
 * @returns {number} The calculated SEO score (0 to 100)
 */
export function calculateSEOScore(note) {
  if (!note) return 100;

  const title = note.seo?.title || note.name || "";
  
  // Calculate description (fallback to first 160 chars of plain text content)
  let description = note.seo?.description || "";
  const content = note.content || "";
  if (!description) {
    const fallbackText = content
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    description = fallbackText.slice(0, 160);
  }

  const tags = Array.isArray(note.seo?.keywords) ? note.seo.keywords : [];
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const contentText = content.replace(/<[^>]*>/g, " ").toLowerCase();

  const titleLen = title.trim().length;
  const descLen = description.trim().length;
  const slug = note.seo?.slug || note.slug || "";

  // Keywords logic
  const keywords = Array.from(
    new Set(tags.map((k) => k.trim().toLowerCase()).filter(Boolean))
  );
  const primaryKeyword = keywords[0] || "";
  const hasKeywords = keywords.length > 0;

  // Heading counts
  const h1Count = (content.match(/<h1[\s>]/gi) || []).length;
  const h2Count = (content.match(/<h2[\s>]/gi) || []).length;

  // Heading Sequence Check
  const headingMatches = Array.from(content.matchAll(/<h([1-6])[\s>]/gi));
  const headingLevels = headingMatches.map((m) => parseInt(m[1]));
  let skippedHeading = false;
  let lastLevel = 0;
  for (const level of headingLevels) {
    if (level > lastLevel + 1) {
      skippedHeading = true;
      break;
    }
    lastLevel = level;
  }

  // Link counts
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "notehub-official.vercel.app";
  const domainRegex = new RegExp(`href=["']https?:\/\/${domain.replace(/\./g, "\\.")}[^"']*["']`, "g");
  const internalLinks = (content.match(domainRegex) || []).length;
  const externalLinks = (content.match(/href=["']https?:\/\/(?!notehub-official\.vercel\.app)[^"']+["']/g) || []).length;

  // Image parsing (including primary keyword search in alt)
  const imageRegex = /<img\s+([^>]*)\/?>/gi;
  let totalImages = 0;
  let imagesWithAlt = 0;
  let imagesWithPrimaryKeywordAlt = 0;
  let imgMatch;
  while ((imgMatch = imageRegex.exec(content)) !== null) {
    totalImages++;
    const attrsStr = imgMatch[1];
    const altMatch = attrsStr.match(/alt=["']([^"']*)["']/i);
    if (altMatch && altMatch[1] && altMatch[1].trim().length > 0) {
      imagesWithAlt++;
      if (primaryKeyword && altMatch[1].toLowerCase().includes(primaryKeyword)) {
        imagesWithPrimaryKeywordAlt++;
      }
    }
  }

  // Canonical and Social fields
  const canonicalUrl = note.seo?.canonicalUrl || `https://${domain}/${note.userId?.userName || "user"}/${note.seo?.slug || note.slug || ""}`;
  const ogTitle = note.seo?.title || note.name || "";
  const ogDescription = note.seo?.description || description;

  // ── Score calculation ─────────────────────────────────────────────────────
  let penaltyTotal = 0;

  // 1. Title exists
  if (title.trim().length === 0) {
    penaltyTotal += 25;
  } else {
    // Title length
    if (titleLen < 30 || titleLen > 70) {
      penaltyTotal += 8;
    } else if (titleLen < 50 || titleLen > 60) {
      penaltyTotal += 4;
    }
  }

  // Title keyword
  if (hasKeywords) {
    const titleLower = title.toLowerCase();
    if (!titleLower.includes(primaryKeyword)) {
      penaltyTotal += 10;
    } else if (titleLower.indexOf(primaryKeyword) === -1 || titleLower.indexOf(primaryKeyword) >= 20) {
      penaltyTotal += 3;
    }
  }

  // 2. Meta description exists
  if (description.trim().length === 0) {
    penaltyTotal += 15;
  } else {
    // Description length
    if (descLen < 80 || descLen > 160) {
      penaltyTotal += 6;
    } else if (descLen < 120 || descLen > 155) {
      penaltyTotal += 3;
    }
  }

  // Description keyword
  if (hasKeywords) {
    const descLower = description.toLowerCase();
    if (!descLower.includes(primaryKeyword)) {
      penaltyTotal += 4;
    }
  }

  // 3. Slug
  if (slug.trim().length === 0) {
    penaltyTotal += 15;
  } else {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      penaltyTotal += 8;
    }
    if (slug.length < 3 || slug.length > 75) {
      penaltyTotal += 3;
    }
    if (hasKeywords) {
      const slugPrimaryKeyword = primaryKeyword.replace(/\s+/g, "-");
      if (!slug.includes(slugPrimaryKeyword)) {
        penaltyTotal += 3;
      }
    }
  }

  // 4. Content length
  if (wordCount < 150) {
    penaltyTotal += 15;
  } else if (wordCount < 300) {
    penaltyTotal += 8;
  }

  // Keyword in intro
  if (hasKeywords) {
    const words = contentText.split(/\s+/).filter(Boolean);
    const introText = words.slice(0, 100).join(" ");
    if (!introText.includes(primaryKeyword)) {
      penaltyTotal += 3;
    }
  }

  // H1
  if (h1Count === 0) {
    penaltyTotal += 20;
  } else if (h1Count > 1) {
    penaltyTotal += 8;
  }

  // H2
  if (h2Count === 0) {
    penaltyTotal += 10;
  } else if (h2Count === 1) {
    penaltyTotal += 5;
  }

  // Heading hierarchy
  if (skippedHeading) {
    penaltyTotal += 8;
  }

  // Keyword in heading
  if (hasKeywords && h2Count > 0) {
    const headings = content.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/gi) || [];
    const primaryKeywordInHeading = headings.some((h) =>
      h.toLowerCase().includes(primaryKeyword)
    );
    if (!primaryKeywordInHeading) {
      penaltyTotal += 4;
    }
  }

  // Links
  if (internalLinks === 0) {
    penaltyTotal += 6;
  } else if (internalLinks < 2) {
    penaltyTotal += 3;
  }

  if (externalLinks === 0) {
    penaltyTotal += 4;
  }

  // Images
  const seoImageUrl = note.seo?.image?.url || "";
  if (totalImages === 0 && !seoImageUrl) {
    penaltyTotal += 5;
  } else if (totalImages > 0) {
    if (imagesWithAlt < totalImages) {
      penaltyTotal += 8;
    }
    if (hasKeywords && imagesWithPrimaryKeywordAlt === 0) {
      penaltyTotal += 3;
    }
  }

  // Social / OG
  if (ogTitle.trim().length === 0) {
    penaltyTotal += 2;
  }
  if (ogDescription.trim().length === 0) {
    penaltyTotal += 2;
  }

  // Technical
  if (note.seo?.canonicalUrl && note.seo.canonicalUrl.trim().length === 0) {
    penaltyTotal += 4;
  }
  if (tags.length < 3 || tags.length > 8) {
    penaltyTotal += 3;
  }

  // Localhost canonical check
  if (canonicalUrl.toLowerCase().includes("localhost")) {
    penaltyTotal += 15;
  }

  return Math.max(0, 100 - penaltyTotal);
}
