import data from "../data/clinics.json";
import type { Clinic } from "./format";

export const asof: string = data.asof;
export const records = data.records as Clinic[];

export const baseTitle = `プレコンセプションケア 検査費等助成 登録医療機関（${asof}）｜非公式`;
export const siteDescription = `東京都のプレコンセプションケア検査費等助成に登録している医療機関の一覧（${asof}）。エリア・受診対象・予約方法から検索できます。個人が作成した非公式サイトであり、東京都が運営するものではありません。`;

const wardCount: Record<string, number> = {};
for (const r of records) wardCount[r.ct] = (wardCount[r.ct] || 0) + 1;

/** 件数の多い順、同数なら五十音順 */
export const wardsSorted = Object.entries(wardCount).sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"),
);

const byName = (a: [string, number], b: [string, number]) => a[0].localeCompare(b[0], "ja");
export const ku = wardsSorted.filter(([w]) => w.endsWith("区")).sort(byName);
export const shi = wardsSorted.filter(([w]) => !w.endsWith("区")).sort(byName);

/** 検査メニューごとの実施機関数（届出シートの登場順を維持） */
export const testCount = { f: new Map<string, number>(), m: new Map<string, number>() };
for (const r of records) {
  for (const [n] of r.tf) testCount.f.set(n, (testCount.f.get(n) || 0) + 1);
  for (const [n] of r.tm) testCount.m.set(n, (testCount.m.get(n) || 0) + 1);
}
