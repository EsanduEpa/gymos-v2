import test from "node:test";
import assert from "node:assert/strict";
import { classicTokens, resolveGymPrimaryColor } from "../dist/classic.js";

test("Classic keeps product status meanings separate from the gym brand", () => {
  assert.equal(classicTokens.brand.primary, "#007A35");
  assert.notEqual(classicTokens.status.danger.foreground, classicTokens.brand.primary);
  assert.notEqual(classicTokens.status.warning.foreground, classicTokens.brand.primary);
  assert.notEqual(classicTokens.status.info.foreground, classicTokens.brand.primary);
});

test("gym accents accept only six-digit hex and safely fall back", () => {
  assert.equal(resolveGymPrimaryColor("#aB12ef"), "#AB12EF");
  assert.equal(resolveGymPrimaryColor("red"), classicTokens.brand.primary);
  assert.equal(resolveGymPrimaryColor("#123"), classicTokens.brand.primary);
  assert.equal(resolveGymPrimaryColor(undefined), classicTokens.brand.primary);
});

test("two gym fixtures get different accents while sharing the Classic baseline", () => {
  const fixtures = ["#A12B3C", "#1764C0"].map(resolveGymPrimaryColor);
  assert.notEqual(fixtures[0], fixtures[1]);
  assert.equal(classicTokens.surface.page, "#F4F5F7");
  assert.equal(classicTokens.border, "#E1E1E4");
});

test("status text has readable contrast on its matching background", () => {
  const luminance = (hex) => {
    const rgb = hex.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16) / 255);
    const linear = rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  for (const status of Object.values(classicTokens.status)) {
    const values = [luminance(status.foreground), luminance(status.background)].sort((a, b) => b - a);
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5);
  }
});
