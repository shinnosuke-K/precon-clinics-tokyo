import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIds, resolveTests, slug } from "./query.ts";

test("slug: 全角英数を半角にし、記号を - にする", () => {
  assert.equal(slug("ＡＭＨ検査"), "AMH検査");
  assert.equal(slug("精液精密検査（DFI検査）"), "精液精密検査-DFI検査");
  assert.equal(slug("Ｂ型肝炎検査"), "B型肝炎検査");
  assert.equal(slug("  甲状腺 ホルモン検査 "), "甲状腺-ホルモン検査");
});

const NAMES = ["ＡＭＨ検査", "甲状腺ホルモン検査", "Ｂ型肝炎検査"];
test("resolveTests: スラッグを検査名に引き直し、順序は want の順", () => {
  assert.deepEqual(resolveTests(NAMES, ["甲状腺ホルモン検査", "AMH検査"]), ["甲状腺ホルモン検査", "ＡＭＨ検査"]);
});
test("resolveTests: 存在しないもの・重複は捨てる", () => {
  assert.deepEqual(resolveTests(NAMES, ["AMH検査", "精液一般検査", "AMH検査", ""]), ["ＡＭＨ検査"]);
});
test("resolveTests: 空なら空", () => {
  assert.deepEqual(resolveTests(NAMES, []), []);
});

test("parseIds: カンマ区切りの番号", () => {
  assert.deepEqual(parseIds("12,57,101"), [12, 57, 101]);
});
test("parseIds: 数値以外・重複・0以下を捨て、最大3件", () => {
  assert.deepEqual(parseIds("12,abc,57,12,0,-3,101,9"), [12, 57, 101]);
  assert.deepEqual(parseIds(" 5 , 6 "), [5, 6]);
});
test("parseIds: 空や null は空配列", () => {
  assert.deepEqual(parseIds(""), []);
  assert.deepEqual(parseIds(null), []);
  assert.deepEqual(parseIds(undefined), []);
});
test("parseIds: max を変えられる", () => {
  assert.deepEqual(parseIds("1,2,3,4,5", 5), [1, 2, 3, 4, 5]);
});
