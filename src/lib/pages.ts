/* 区市町村ページ・検査メニューページの定義。トップのリンク一覧と各ページの生成で共用する */
import { records, testCount, wardsSorted } from "./clinics";
import { type Clinic, amtNum, url } from "./format";
import { testOf } from "./row";

/** 検査名をURL用に直す。全角英数は半角にし、括弧や空白は「-」に置き換える（例: ＡＭＨ検査 → AMH検査） */
export const slug = (s: string) =>
  s.normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

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

export const testPages: TestPage[] = (["f", "m"] as Side[]).flatMap((side) =>
  [...testCount[side].keys()].map((name) => {
    const key = `${side}:${name}`;
    const price = (r: Clinic) => amtNum(testOf(r, key)![1]);
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
