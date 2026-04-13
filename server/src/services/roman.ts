/**
 * Integer to Roman numeral: classical **subtractive** by default (1–3999 and the thousands block for n ≥ 4000);
 * **additive** when `additive=true` (same for remainder 0–999 and for the thousands vinculum block).
 * @see https://en.wikipedia.org/wiki/Roman_numerals#Large_numbers
 */
const VALUES = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1] as const;
const SYMBOLS = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"] as const;

const ADDITIVE_PATTERN = /CM|CD|XC|XL|IX|IV/g;
const ADDITIVE_MAP: Record<string, string> = {
  CM: "DCCCC",
  CD: "CCCC",
  XC: "LXXXX",
  XL: "XXXX",
  IX: "VIIII",
  IV: "IIII"
};

/** Upper bound for greedy I–M notation without overlines. */
export const ROMAN_BASE_MAX = 3999;

export const ROMAN_MIN = 1;
export const ROMAN_MAX = 3_999_999;

const COMBINING_OVERLINE = "\u0305";

/**
 * Converts 1–3999 using standard subtractive notation (no overlines).
 */
function toRomanBase(num: number): string {
  let n = num;
  let out = "";
  for (let i = 0; i < VALUES.length && n > 0; i++) {
    const v = VALUES[i];
    const s = SYMBOLS[i];
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

/**
 * Classical subtractive form for **1–3999** (IV, IX, XL, …).
 */
export function toRomanSubtractive(num: number): string {
  if (!Number.isInteger(num) || num < 1 || num > ROMAN_BASE_MAX) {
    throw new RangeError(`Subtractive form requires an integer between 1 and ${ROMAN_BASE_MAX}`);
  }
  return toRomanBase(num);
}

/**
 * Adds one vinculum layer: one U+0305 after each Roman letter block (letter + any existing overlines).
 */
function addVinculumLayer(s: string): string {
  return s.replace(/[IVXLCDM](?:\u0305)*/g, (block) => block + COMBINING_OVERLINE);
}

/**
 * Classic subtractive form expanded to additive symbols only (I, V, X, L, C, D, M),
 * so each glyph ×1000 under a vinculum matches “bar over the whole value”.
 */
export function toRomanAdditive(num: number): string {
  if (!Number.isInteger(num) || num < 1 || num > ROMAN_BASE_MAX) {
    throw new RangeError(`Additive expansion requires an integer between 1 and ${ROMAN_BASE_MAX}`);
  }
  return toRomanBase(num).replace(ADDITIVE_PATTERN, (m) => ADDITIVE_MAP[m]);
}

function classicalPart(num: number, additive: boolean): string {
  return additive ? toRomanAdditive(num) : toRomanSubtractive(num);
}

/**
 * Converts a positive integer to Roman numerals up to {@link ROMAN_MAX}.
 * @param additive When `true`, use additive classical form everywhere it applies (1–3999, thousands block, remainder). Default `false` (subtractive).
 */
export function toRoman(num: number, additive = false): string {
  if (!Number.isInteger(num) || num < ROMAN_MIN || num > ROMAN_MAX) {
    throw new RangeError(`Value must be an integer between ${ROMAN_MIN} and ${ROMAN_MAX}`);
  }
  if (num <= ROMAN_BASE_MAX) {
    return classicalPart(num, additive);
  }
  const thousands = Math.floor(num / 1000);
  const remainder = num % 1000;
  const thousandsStr = additive ? toRomanAdditive(thousands) : toRomanSubtractive(thousands);
  const prefix = addVinculumLayer(thousandsStr);
  const suffix = remainder === 0 ? "" : classicalPart(remainder, additive);
  return prefix + suffix;
}

export interface RomanPair {
  input: string;
  output: string;
}

export interface RomanRangeOptions {
  /** Batch size for parallel chunk work. Default 250. */
  chunkSize?: number;
  /** When `true`, additive classical form per value. Default `false`. */
  additive?: boolean;
}

/**
 * Converts a contiguous range using chunked async scheduling.
 * Preallocates the result array and fills by index so ordering stays correct without
 * building intermediate `slice`/`flat` structures.
 * Results are sorted ascending by input value.
 */
export async function toRomanRangeParallel(
  min: number,
  max: number,
  options: RomanRangeOptions = {}
): Promise<RomanPair[]> {
  const chunkSize = options.chunkSize ?? 250;
  const additive = options.additive ?? false;
  const totalCount = max - min + 1;

  const results: RomanPair[] = new Array(totalCount);

  const promises: Promise<void>[] = [];
  for (let start = min; start <= max; start += chunkSize) {
    const chunkStart = start;
    const chunkEnd = Math.min(start + chunkSize - 1, max);
    const offset = chunkStart - min;

    promises.push(
      Promise.resolve().then(() => {
        for (let n = chunkStart; n <= chunkEnd; n++) {
          results[offset + n - chunkStart] = {
            input: String(n),
            output: toRoman(n, additive)
          };
        }
      })
    );
  }

  await Promise.all(promises);
  return results;
}
