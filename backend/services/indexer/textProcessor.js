import * as cheerio from "cheerio";
import { removeStopwords } from "stopword";
import natural from "natural";

const { PorterStemmer } = natural;

export function normalizeText(text) {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2);

  return [
    ...new Set(
      removeStopwords(tokens).map(w => PorterStemmer.stem(w))
    ),
  ];
}

export function extractKeywords(html) {
  const $ = cheerio.load(html);
  let text = "";

  $("h1,h2,h3,h4,h5,h6,strong,b").each((_, el) => {
    text += " " + $(el).text();
  });

  return normalizeText(text);
}
