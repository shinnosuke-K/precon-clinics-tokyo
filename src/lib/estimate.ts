/* 費用の見積もり。純粋関数だけを置き、Node の標準テストランナーで単体テストする。
   format.ts は import.meta.env を使うので値としては import しない（型のみ） */
import type { Clinic, Test } from "./format";
export type { Test };

/** 助成上限（円、女性・男性とも）。出典: 東京都福祉局「プレコンセプションケア」
    https://www.fukushi.metro.tokyo.lg.jp/kodomo/shussan/preconceptioncare （2026-10-08 確認） */
export const SUBSIDY_CAP = 30000;

export type Kind = "num" | "included" | "approx" | "unknown";
export type Gender = "f" | "m";
export interface Amount {
  yen: number;
  kind: Kind;
}
export interface EstimateItem {
  label: string;
  yen: number;
  kind: Kind;
  group: "fee" | "must" | "test";
}
export interface Estimate {
  /** 窓口での合計 */
  total: number;
  /** 自己負担の目安 = max(0, total - SUBSIDY_CAP) */
  copay: number;
  /** 内訳に approx/unknown があるか、未実施の検査があれば true */
  uncertain: boolean;
  items: EstimateItem[];
  /** 選んだ検査のうち、この機関が実施していないもの */
  missing: string[];
}

/** 金額セルの文字列を解釈する。
    数値のみ → num、「含」を含む → included（追加0円）、数値が1つ → num、2つ以上 → 最初の値で approx、
    数値なし・空 → unknown */
export function parseAmount(s: string | null | undefined): Amount {
  if (s == null) return { yen: 0, kind: "unknown" };
  const t = String(s).normalize("NFKC").trim();
  if (t === "") return { yen: 0, kind: "unknown" };
  if (/^\d+$/.test(t)) return { yen: Number(t), kind: "num" };
  if (t.includes("含")) return { yen: 0, kind: "included" };
  const nums = t.match(/\d[\d,]*/g);
  if (!nums) return { yen: 0, kind: "unknown" };
  return { yen: Number(nums[0].replace(/,/g, "")), kind: nums.length === 1 ? "num" : "approx" };
}

/** 検査1項目の費用。
    サブ項目があればその合計（「含む」は0円）。届出シートでは検査名の行が最初のサブ項目の行と同じで、
    「検査の金額」として読んだ値は最初のサブ項目の金額にすぎないので、親の金額は足さない。
    サブ項目がなければ親の金額 */
export function testCost(t: Test): Amount {
  const [, amt, subs] = t;
  const a = parseAmount(amt);
  if (subs.length === 0) return a;
  const parsed = subs.map(([, sa]) => parseAmount(sa));
  if (parsed.every((p) => p.kind === "included")) return { yen: 0, kind: a.kind === "num" ? "included" : a.kind };
  const yen = parsed.reduce((sum, p) => sum + p.yen, 0);
  const kind: Kind = parsed.some((p) => p.kind === "approx" || p.kind === "unknown") ? "approx" : "num";
  return { yen, kind };
}

export function estimate(r: Clinic, g: Gender, selected: string[]): Estimate {
  const items: EstimateItem[] = [];
  const push = (label: string, a: Amount, group: EstimateItem["group"]) =>
    items.push({ label, yen: a.yen, kind: a.kind, group });
  push("初診料", parseAmount(r.fee[0]), "fee");
  push("助言・相談料", parseAmount(r.fee[2]), "fee");
  for (const [name, amt] of r.must) push(name, parseAmount(amt), "must");
  const src = g === "f" ? r.tf : r.tm;
  const missing: string[] = [];
  for (const name of selected) {
    const t = src.find((x) => x[0] === name);
    if (t) push(name, testCost(t), "test");
    else missing.push(name);
  }
  const total = items.reduce((sum, i) => sum + i.yen, 0);
  const uncertain = missing.length > 0 || items.some((i) => i.kind === "approx" || i.kind === "unknown");
  return { total, copay: Math.max(0, total - SUBSIDY_CAP), uncertain, items, missing };
}

export const fmtYen = (v: number) => "¥" + v.toLocaleString("en-US");

/** 一覧・比較ページで使う1行の文言 */
export function estimateLabel(e: Estimate): string {
  if (e.missing.length) return "未実施の検査あり";
  const t = e.uncertain ? "〜" : "";
  return `合計 ${fmtYen(e.total)}${t} ／ 自己負担 ${fmtYen(e.copay)}${t}${e.uncertain ? "（要確認）" : ""}`;
}
