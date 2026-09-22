/**
 * Choose the best of several OCR passes over the same image.
 *
 * Tesseract's page segmentation modes trade off against each other on
 * receipts: "single column" can silently drop a right-hand price column,
 * "uniform block" reads any background texture as words. Rather than pick one
 * mode, run both and keep the text that looks most like a receipt: the most
 * priced lines, and among equals the least junk.
 */

const PRICE = /[$£]?\s?\d+\.\d{2}/;
// A line is "clean" when it is mostly letters/digits rather than isolated
// characters and symbols — real receipt lines, not texture read as text.
const WORD = /[A-Za-z]{3,}|\d+\.\d{2}/g;

interface Score {
  priced: number;
  junk: number;
}

function score(text: string): Score {
  let priced = 0;
  let junk = 0;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (PRICE.test(line)) priced += 1;
    // Junk: tokens that are neither a real word nor a price.
    const tokens = line.split(/\s+/);
    const words = line.match(WORD)?.length ?? 0;
    junk += Math.max(0, tokens.length - words);
  }
  return { priced, junk };
}

/** The pass with the most priced lines; ties go to the least junk, then to the earlier pass. */
export function pickBestText(passes: string[]): string {
  let best = passes[0] ?? '';
  let bestScore = score(best);
  for (const text of passes.slice(1)) {
    const s = score(text);
    if (s.priced > bestScore.priced || (s.priced === bestScore.priced && s.junk < bestScore.junk)) {
      best = text;
      bestScore = s;
    }
  }
  return best;
}
