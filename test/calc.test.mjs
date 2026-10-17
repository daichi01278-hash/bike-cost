import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, keiTax, weightTax2y, elapsedMonths, ageYears, annualCost, sellHints } from "../src/calc.mjs";

test("classify by displacement", () => {
  assert.equal(classify(50), "gentsuki1");
  assert.equal(classify(110), "gentsuki2");
  assert.equal(classify(250), "kei2");
  assert.equal(classify(251), "kogata2");
  assert.throws(() => classify(0));
  assert.throws(() => classify(NaN));
});

test("light vehicle tax brackets", () => {
  assert.equal(keiTax(50), 2000);
  assert.equal(keiTax(90), 2000);
  assert.equal(keiTax(91), 2400);
  assert.equal(keiTax(125), 2400);
  assert.equal(keiTax(126), 3600);
  assert.equal(keiTax(1300), 6000);
});

test("weight tax steps up at 12y10m and 17y10m (MLIT rule)", () => {
  assert.equal(weightTax2y(153), 3800);
  assert.equal(weightTax2y(154), 4600);
  assert.equal(weightTax2y(213), 4600);
  assert.equal(weightTax2y(214), 5000);
  // MLITの例: 2012年6月初度登録 → 2025年4月の検査から13年経過
  assert.equal(weightTax2y(elapsedMonths(2012, 6, new Date(2025, 3, 1))), 4600);
  assert.equal(weightTax2y(elapsedMonths(2012, 6, new Date(2025, 2, 1))), 3800);
});

test("age counts whole years from first registration month", () => {
  const d = new Date(2026, 9, 16); // 2026-10
  assert.equal(ageYears(2013, 10, d), 13);
  assert.equal(ageYears(2013, 11, d), 12);
  assert.equal(ageYears(2030, 1, d), 0);
});

test("250cc has no inspection or weight tax lines", () => {
  const r = annualCost({ cc: 250, firstRegYear: 2020, kmPerYear: 6000, kmPerLiter: 30, fuelPrice: 160, insurance: 20000, parkingMonthly: 0, maintenance: 20000 }, new Date(2026, 9, 16));
  const keys = r.items.map((i) => i.key);
  assert.ok(!keys.includes("weightTax"));
  assert.ok(!keys.includes("shaken"));
  // 3600 + 9780/2 + 6000/30*160 + 20000 + 0 + 20000
  assert.equal(r.annual, 3600 + 4890 + 32000 + 20000 + 20000);
  assert.equal(r.monthly, Math.round(r.annual / 12));
});

test("400cc includes inspection costs and old-bike weight tax", () => {
  const r = annualCost({ cc: 400, firstRegYear: 2010, firstRegMonth: 4, kmPerYear: 0, kmPerLiter: 20, fuelPrice: 165, insurance: 0, parkingMonthly: 0, maintenance: 0, inspectionFee: 1800, shakenService: 20000 }, new Date(2026, 9, 16));
  const byKey = Object.fromEntries(r.items.map((i) => [i.key, i.yen]));
  assert.equal(byKey.weightTax, 2300); // 16年経過 → 4,600/2
  assert.equal(byKey.shaken, 10900);
  assert.equal(byKey.jibaiseki, 4820);
  assert.equal(r.annual, 6000 + 4820 + 2300 + 10900);
});

test("zero km per liter does not divide by zero", () => {
  const r = annualCost({ cc: 125, firstRegYear: 2024, kmPerYear: 1000, kmPerLiter: 0, fuelPrice: 165 }, new Date(2026, 0, 1));
  assert.equal(r.items.find((i) => i.key === "fuel").yen, 0);
});

test("sell hint: act in Q1 because of April 1 tax", () => {
  const h = sellHints({ cc: 250, firstRegYear: 2020 }, new Date(2027, 1, 10));
  assert.equal(h[0].level, "act");
  assert.match(h[0].text, /3,600円/);
});

test("sell hint: inspection due soon for 400cc", () => {
  const h = sellHints({ cc: 400, firstRegYear: 2018, firstRegMonth: 5, shakenExpiry: "2026-12", shakenService: 20000 }, new Date(2026, 9, 16));
  const act = h.find((x) => x.level === "act");
  assert.ok(act);
  assert.match(act.text, /約2か月/);
  // 3800 + 9640 + 2100 + 20000
  assert.match(act.text, /35,540円/);
});

test("sell hint: weight tax step-up warning near 13 years", () => {
  const h = sellHints({ cc: 650, firstRegYear: 2015, firstRegMonth: 1 }, new Date(2026, 9, 16));
  assert.ok(h.some((x) => /12年10か月\(13年経過の扱い\)/.test(x.text)));
});

test("sell hint: expired inspection warns", () => {
  const h = sellHints({ cc: 400, firstRegYear: 2018, shakenExpiry: "2026-01" }, new Date(2026, 9, 16));
  assert.ok(h.some((x) => x.level === "warn"));
});
