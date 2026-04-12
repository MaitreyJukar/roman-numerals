import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ROMAN_MAX, toRoman, toRomanAdditive, toRomanRangeParallel, toRomanSubtractive } from "../src/services/roman.js";

describe("toRomanSubtractive", () => {
  it("converts known values", () => {
    assert.equal(toRomanSubtractive(1), "I");
    assert.equal(toRomanSubtractive(4), "IV");
    assert.equal(toRomanSubtractive(9), "IX");
    assert.equal(toRomanSubtractive(944), "CMXLIV");
    assert.equal(toRomanSubtractive(3999), "MMMCMXCIX");
  });
});

describe("toRoman (default subtractive)", () => {
  it("matches subtractive for 1–3999", () => {
    assert.equal(toRoman(1), "I");
    assert.equal(toRoman(4), "IV");
    assert.equal(toRoman(9), "IX");
    assert.equal(toRoman(49), "XLIX");
    assert.equal(toRoman(90), "XC");
    assert.equal(toRoman(400), "CD");
    assert.equal(toRoman(944), "CMXLIV");
    assert.equal(toRoman(1987), "MCMLXXXVII");
    assert.equal(toRoman(3999), "MMMCMXCIX");
  });

  it("uses subtractive vinculum for values above 3999 by default", () => {
    const o = "\u0305";
    assert.equal(toRoman(4000), `I${o}V${o}`);
    assert.equal(toRoman(5000), `V${o}`);
    assert.equal(toRoman(10_000), `X${o}`);
    assert.equal(toRoman(1_000_000), `M${o}`);
    assert.equal(toRoman(3_000_000), `M${o}M${o}M${o}`);
    assert.equal(toRoman(1001), "MI");
    assert.equal(toRoman(1_001_001), `M${o}I${o}I`);
  });

  it("converts maximum supported value", () => {
    const o = "\u0305";
    const prefix = toRomanSubtractive(3999).replace(/[IVXLCDM]/g, (c) => c + o);
    assert.equal(toRoman(3_999_999), `${prefix}CMXCIX`);
  });

  it("rejects out of range", () => {
    assert.throws(() => toRoman(0), /RangeError/);
    assert.throws(() => toRoman(4_000_000), /RangeError/);
    assert.throws(() => toRoman(1.5), /RangeError/);
  });
});

describe("toRoman (additive flag)", () => {
  it("uses additive classical form for 1–3999", () => {
    assert.equal(toRoman(4, true), "IIII");
    assert.equal(toRoman(9, true), "VIIII");
    assert.equal(toRoman(40, true), "XXXX");
    assert.equal(toRoman(49, true), "XXXXVIIII");
    assert.equal(toRoman(90, true), "LXXXX");
    assert.equal(toRoman(400, true), "CCCC");
    assert.equal(toRoman(900, true), "DCCCC");
    assert.equal(toRoman(14, true), "XIIII");
  });

  it("additive flag affects thousands block and remainder", () => {
    const o = "\u0305";
    assert.equal(toRoman(4000, true), `I${o}I${o}I${o}I${o}`);
    assert.equal(toRoman(4004, true), `I${o}I${o}I${o}I${o}IIII`);
    assert.equal(toRoman(4004, false), `I${o}V${o}IV`);
  });
});

describe("toRomanRangeParallel", () => {
  it("returns ascending pairs", async () => {
    const rows = await toRomanRangeParallel(1, 5, { chunkSize: 2 });
    assert.equal(rows.length, 5);
    assert.deepEqual(
      rows.map((r) => r.input),
      ["1", "2", "3", "4", "5"]
    );
    assert.equal(rows[0].output, "I");
    assert.equal(rows[4].output, "V");
  });

  it("respects additive option", async () => {
    const rows = await toRomanRangeParallel(3, 5, { additive: true });
    assert.deepEqual(
      rows.map((r) => r.output),
      ["III", "IIII", "V"]
    );
  });

  it("handles large span at upper bound", async () => {
    const rows = await toRomanRangeParallel(ROMAN_MAX - 2, ROMAN_MAX, { chunkSize: 50 });
    assert.equal(rows.length, 3);
    assert.equal(rows.at(-1)?.output, toRoman(ROMAN_MAX));
  });
});
