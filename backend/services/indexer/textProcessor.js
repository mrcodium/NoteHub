import * as cheerio from "cheerio";
import { removeStopwords } from "stopword";
import natural from "natural";

const { PorterStemmer } = natural;

/**
 * Normalize text into tokens (NOT unique)
 * - lowercase
 * - remove symbols
 * - remove stopwords
 * - stem words
 */
export function normalizeText(text) {
  return removeStopwords(
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2)
  ).map(w => PorterStemmer.stem(w));
}

/**
 * Extract keywords WITH frequency
 * returns: { lemma: tf }
 */
export function extractKeywordFrequency(html) {
  const $ = cheerio.load(html);
  let text = "";

  // Important content signals
  $("h1,h2,h3,h4,h5,h6,strong,b,p,li").each((_, el) => {
    text += " " + $(el).text();
  });

  const tokens = normalizeText(text);
  const freq = {};

  for (const token of tokens) {
    freq[token] = (freq[token] || 0) + 1;
  }

  return freq;
}

/**
 * (Optional) If you still need unique keywords somewhere
 */
export function extractKeywords(html) {
  return Object.keys(extractKeywordFrequency(html));
}
