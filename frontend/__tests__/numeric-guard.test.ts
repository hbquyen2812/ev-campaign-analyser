import { describe, expect, it } from "vitest";
import {
  buildAllowedNumbers,
  extractNumbers,
  findUnsupportedNumbers,
  parseVnNumber,
  redactUnsupportedNumbers,
} from "@/lib/numeric-guard";
import { allowedNumberSources } from "@/lib/personas";

describe("parseVnNumber", () => {
  it("reads dots as thousand groups", () => {
    expect(parseVnNumber("35.000.000")).toBe(35_000_000);
    expect(parseVnNumber("4.500")).toBe(4500);
  });
  it("reads a comma before one or two digits as a decimal mark", () => {
    expect(parseVnNumber("1,1")).toBeCloseTo(1.1);
  });
  it("reads plain integers", () => {
    expect(parseVnNumber("120")).toBe(120);
  });
});

describe("extractNumbers", () => {
  it("scales magnitude words to đồng", () => {
    const [n] = extractNumbers("giá 35 triệu thôi");
    expect(n.unitClass).toBe("currency");
    expect(n.value).toBe(35_000_000);
  });
  it("keeps unknown words out of the unit", () => {
    const [n] = extractNumbers("có 3 lý do");
    expect(n.unit).toBe("");
    expect(n.unitClass).toBe("count");
    expect(n.raw).toBe("3");
  });
  it("separates unit families", () => {
    expect(extractNumbers("3 năm")[0].unitClass).toBe("time");
    expect(extractNumbers("30 cm")[0].unitClass).toBe("distance");
  });
});

describe("findUnsupportedNumbers", () => {
  const allowed = buildAllowedNumbers(allowedNumberSources("Xe đi 200 km một lần sạc."));

  it("accepts a spec sheet figure written in another form", () => {
    // Sheet says 35.000.000 đ; the model wrote "35 triệu".
    expect(findUnsupportedNumbers("Giá chỉ 35 triệu ạ.", allowed)).toHaveLength(0);
  });

  it("accepts a figure quoted from the user's own post", () => {
    expect(findUnsupportedNumbers("Bài nói 200 km mà.", allowed)).toHaveLength(0);
  });

  it("flags an invented warranty", () => {
    // The sheet says 3 năm. This is the failure the guard exists for.
    const bad = findUnsupportedNumbers("Pin bảo hành 8 năm ạ.", allowed);
    expect(bad).toHaveLength(1);
    expect(bad[0].raw).toBe("8 năm");
  });

  it("does not let a matching value in another unit pass", () => {
    // 3 is a valid warranty in years, but not a valid wading depth in metres.
    expect(findUnsupportedNumbers("Lội nước 3 m thoải mái.", allowed)).toHaveLength(1);
  });

  it("ignores small bare counts and years", () => {
    expect(findUnsupportedNumbers("Có 2 điểm cần lưu ý trong 2025.", allowed)).toHaveLength(0);
  });
});

describe("redactUnsupportedNumbers", () => {
  const allowed = buildAllowedNumbers(allowedNumberSources(""));

  it("blanks the figure but keeps the unit", () => {
    const { text, redacted } = redactUnsupportedNumbers("Pin bảo hành 8 năm ạ.", allowed);
    expect(text).toBe("Pin bảo hành … năm ạ.");
    expect(redacted).toHaveLength(1);
  });

  it("blanks several figures without shifting the later ones", () => {
    const { text } = redactUnsupportedNumbers("Đi 900 km, bảo hành 8 năm.", allowed);
    expect(text).toBe("Đi … km, bảo hành … năm.");
  });

  it("leaves a fully supported sentence untouched", () => {
    const sentence = "Quãng đường 120 km, bảo hành 3 năm.";
    expect(redactUnsupportedNumbers(sentence, allowed).text).toBe(sentence);
  });
});
