import { test } from "node:test";
import assert from "node:assert/strict";
import { SUBSIDY_CAP, estimate, estimateLabel, fmtYen, parseAmount, testCost } from "./estimate.ts";
import type { Clinic, Test } from "./format.ts";

test("parseAmount: 数値のみ", () => {
  assert.deepEqual(parseAmount("3000"), { yen: 3000, kind: "num" });
  assert.deepEqual(parseAmount("0"), { yen: 0, kind: "num" });
});
test("parseAmount: 空は unknown", () => {
  assert.deepEqual(parseAmount(""), { yen: 0, kind: "unknown" });
  assert.deepEqual(parseAmount(null), { yen: 0, kind: "unknown" });
  assert.deepEqual(parseAmount(undefined), { yen: 0, kind: "unknown" });
  assert.deepEqual(parseAmount("  "), { yen: 0, kind: "unknown" });
});
test("parseAmount: 「含む」は included", () => {
  assert.deepEqual(parseAmount("（上記金額に含む）"), { yen: 0, kind: "included" });
  assert.deepEqual(parseAmount("（初診料に含む）"), { yen: 0, kind: "included" });
  assert.deepEqual(parseAmount("（B型肝炎検査の金額に含む）"), { yen: 0, kind: "included" });
  assert.deepEqual(parseAmount("（3,000円の検査に含む）"), { yen: 0, kind: "included" });
});
test("parseAmount: 数値が1つの文字列は num", () => {
  assert.deepEqual(parseAmount("3,300円"), { yen: 3300, kind: "num" });
  assert.deepEqual(parseAmount("0円"), { yen: 0, kind: "num" });
  assert.deepEqual(parseAmount("620円"), { yen: 620, kind: "num" });
});
test("parseAmount: 全角の数字とカンマも読む", () => {
  assert.deepEqual(parseAmount("３，３００円"), { yen: 3300, kind: "num" });
});
test("parseAmount: 数値が2つ以上は最初の値で approx", () => {
  assert.deepEqual(parseAmount("平日：3,080円  土曜：4,180円"), { yen: 3080, kind: "approx" });
  assert.deepEqual(parseAmount("3,300～6,600円"), { yen: 3300, kind: "approx" });
  assert.deepEqual(parseAmount("30,250円\n(①～⑦を検査しない場合19,920円)"), { yen: 30250, kind: "approx" });
});
test("parseAmount: 数字なしの文字列は unknown", () => {
  assert.deepEqual(parseAmount("要相談"), { yen: 0, kind: "unknown" });
});

const t = (amt: string, subs: [string, string][] = []): Test => ["感染症検査", amt, subs];
test("testCost: 親が数値なら親の値（サブ項目は見ない）", () => {
  assert.deepEqual(testCost(t("4000", [["梅毒", "1000"], ["淋病", "3000"]])), { yen: 4000, kind: "num" });
});
test("testCost: 親が approx でも親の値を使う", () => {
  assert.deepEqual(testCost(t("平日 4,000円 土曜 5,000円", [["梅毒", "1000"]])), { yen: 4000, kind: "approx" });
});
test("testCost: 親が含むでサブ項目に数値があればサブ項目の合計", () => {
  assert.deepEqual(testCost(t("（B型肝炎検査の金額に含む）", [["梅毒", "（B型肝炎検査の金額に含む）"], ["淋病", "3000"], ["クラミジア", "（上記金額に含む）"]])), { yen: 3000, kind: "num" });
});
test("testCost: サブ項目が全部含むなら 0 で親の kind", () => {
  assert.deepEqual(testCost(t("（初診料に含む）", [["梅毒", "（上記金額に含む）"]])), { yen: 0, kind: "included" });
});
test("testCost: 親が空でサブ項目なしは unknown", () => {
  assert.deepEqual(testCost(t("")), { yen: 0, kind: "unknown" });
});
test("testCost: サブ項目に approx があれば approx", () => {
  assert.deepEqual(testCost(t("（上記金額に含む）", [["梅毒", "1,000～2,000円"], ["淋病", "3000"]])), { yen: 4000, kind: "approx" });
});

const clinic = (over: Partial<Clinic> = {}): Clinic => ({
  n: 1, nm: "テスト", note: "", ct: "新宿区", ad: "東京都新宿区1-1", tel: "", dt: "2024-05-24", as: "令和6年5月1日",
  kb: "both", kb2: "both", sp: false, rv: [], cs: ["対面"],
  fee: ["3000", "1000", "（上記金額に含む）"],
  must: [["尿検査（たんぱく、糖）", "500"], ["血液検査（Ｆｅ、ＴＰ、コレステロール、糖、腎機能）", "1000"], ["麻疹抗体検査", "2500"]],
  tf: [["ＡＭＨ検査", "6500", []], ["甲状腺ホルモン検査", "2000", []]],
  tm: [["精液一般検査", "5000", []]],
  ...over,
});
test("estimate: 初診料＋助言相談＋必須3項目＋選んだ検査", () => {
  const e = estimate(clinic(), "f", ["ＡＭＨ検査"]);
  assert.equal(e.total, 13500);
  assert.equal(e.copay, 0);
  assert.equal(e.uncertain, false);
  assert.deepEqual(e.missing, []);
  assert.equal(e.items.length, 6);
  assert.deepEqual(e.items.map((i) => i.group), ["fee", "fee", "must", "must", "must", "test"]);
  assert.deepEqual(e.items[5], { label: "ＡＭＨ検査", yen: 6500, kind: "num", group: "test" });
});
test("estimate: 再診料は含めない", () => {
  const e = estimate(clinic({ fee: ["3000", "99999", "0"] }), "f", []);
  assert.equal(e.total, 7000);
});
test("estimate: 3万円を超えた分が自己負担", () => {
  const e = estimate(clinic({ tf: [["ＡＭＨ検査", "30000", []]] }), "f", ["ＡＭＨ検査"]);
  assert.equal(e.total, 37000);
  assert.equal(e.copay, 7000);
});
test("estimate: ちょうど上限なら自己負担 0", () => {
  const e = estimate(clinic({ tf: [["ＡＭＨ検査", String(SUBSIDY_CAP - 7000), []]] }), "f", ["ＡＭＨ検査"]);
  assert.equal(e.total, SUBSIDY_CAP);
  assert.equal(e.copay, 0);
});
test("estimate: 未実施の検査は missing に入り uncertain", () => {
  const e = estimate(clinic(), "f", ["ＡＭＨ検査", "経膣超音波検査"]);
  assert.deepEqual(e.missing, ["経膣超音波検査"]);
  assert.equal(e.uncertain, true);
  assert.equal(e.total, 13500);
});
test("estimate: 内訳に approx があれば uncertain", () => {
  const e = estimate(clinic({ fee: ["平日 3,000円 土曜 4,000円", "", ""] }), "f", []);
  assert.equal(e.uncertain, true);
  assert.equal(e.total, 7000);
});
test("estimate: 男性は tm から引く", () => {
  const e = estimate(clinic(), "m", ["精液一般検査"]);
  assert.equal(e.total, 12000);
  assert.deepEqual(e.missing, []);
});
test("estimate: 選んだ検査の順を保つ", () => {
  const e = estimate(clinic(), "f", ["甲状腺ホルモン検査", "ＡＭＨ検査"]);
  assert.deepEqual(e.items.filter((i) => i.group === "test").map((i) => i.label), ["甲状腺ホルモン検査", "ＡＭＨ検査"]);
});

test("fmtYen", () => {
  assert.equal(fmtYen(0), "¥0");
  assert.equal(fmtYen(12300), "¥12,300");
});
test("estimateLabel", () => {
  assert.equal(estimateLabel(estimate(clinic(), "f", ["ＡＭＨ検査"])), "合計 ¥13,500 ／ 自己負担 ¥0");
  assert.equal(estimateLabel(estimate(clinic({ fee: ["3,000～4,000円", "", ""] }), "f", [])), "合計 ¥7,000〜 ／ 自己負担 ¥0〜（要確認）");
  assert.equal(estimateLabel(estimate(clinic(), "f", ["経膣超音波検査"])), "未実施の検査あり");
});
