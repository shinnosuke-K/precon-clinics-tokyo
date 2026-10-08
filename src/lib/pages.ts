/* 区市町村ページ・検査メニューページの定義。トップのリンク一覧と各ページの生成で共用する */
import { records, testCount, wardsSorted } from "./clinics";
import { type Clinic, url } from "./format";
import { type Test, testCost } from "./estimate";
import { slug } from "./query";
import { testOf } from "./row";

export const areaPath = (ward: string) => `area/${ward}/`;

export type Side = "f" | "m";
export const SIDELABEL: Record<Side, string> = { f: "女性", m: "男性" };

export interface TestPage {
  side: Side;
  name: string;
  /** filter.ts が使う "f:ＡＭＨ検査" 形式のキー */
  key: string;
  slug: string;
  path: string;
  /** その検査を実施する機関。料金の安い順（金額が数値でないものは最後）、同額なら登録順 */
  rows: Clinic[];
}

/** 並び順・料金幅に使う金額。数値で決まらないもの（含む・要確認なし）は末尾に回す */
export const testPrice = (t: Test) => {
  const a = testCost(t);
  return a.kind === "num" || a.kind === "approx" ? a.yen : Infinity;
};

export const testPages: TestPage[] = (["f", "m"] as Side[]).flatMap((side) =>
  [...testCount[side].keys()].map((name) => {
    const key = `${side}:${name}`;
    const price = (r: Clinic) => testPrice(testOf(r, key)!);
    const rows = records.filter((r) => testOf(r, key)).sort((a, b) => price(a) - price(b) || a.n - b.n);
    const s = slug(name);
    return { side, name, key, slug: s, path: `test/${side}/${s}/`, rows };
  }),
);

export const testUrl = (t: TestPage) => url(t.path);

/** 区市町村ごとの機関。wardsSorted と同じ順（件数の多い順） */
export const areaPages = wardsSorted.map(([ward, count]) => ({
  ward,
  count,
  path: areaPath(ward),
  rows: records.filter((r) => r.ct === ward),
}));
