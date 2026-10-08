/* 一覧1行のHTML。ビルド時（index.astro・区ページ・検査ページ）とブラウザ側（filter.ts）の両方で使うので文字列で組む */
import { type Clinic, KBLABEL, clinicUrl, esc, hasOnline, hasWeb, streetOf, yen } from "./format";
import { type Estimate, type Gender, type Test, estimate, fmtYen, testCost } from "./estimate";

export interface RowOpts {
  /** 見積もりの性別。空なら検査タグも見積もり行も出さない */
  g?: Gender | "";
  /** 選んだ検査名（tf/tm の名称と一致） */
  tests?: string[];
  /** true なら合計・自己負担の行を出す（一覧ページのみ） */
  est?: boolean;
}

/** 選択中の検査メニュー（"f:AMH検査" 形式）に対応する、その機関の検査項目 */
export function testOf(r: Clinic, test: string) {
  if (!test) return null;
  const side = test[0];
  const name = test.slice(2);
  return (side === "f" ? r.tf : r.tm).find((x) => x[0] === name) || null;
}

const priceTag = (v: string) => {
  const [t, c] = yen(v);
  return esc(c === "na" && t.length > 9 ? "詳細を参照" : t);
};
/** 検査の費用の表示（サブ項目があればその合計） */
export const testPriceLabel = (t: Test) => {
  const a = testCost(t);
  if (a.kind === "num") return fmtYen(a.yen);
  if (a.kind === "approx") return fmtYen(a.yen) + "〜";
  if (a.kind === "included") return "含む";
  return "詳細を参照";
};

export function tagsHTML(r: Clinic, g: Gender | "" = "", tests: string[] = []) {
  const tags = [`<span class="tag kb">${KBLABEL[r.kb]}</span>`];
  if (r.note) tags.push(`<span class="tag stop">受付停止中</span>`);
  if (r.sp) tags.push(`<span class="tag sp">女性ヘルスケア専門医</span>`);
  if (hasOnline(r)) tags.push(`<span class="tag">オンライン相談</span>`);
  if (hasWeb(r)) tags.push(`<span class="tag">web予約</span>`);
  tags.push(`<span class="tag">初診 ${priceTag(r.fee[0])}</span>`);
  if (g) {
    const src = g === "f" ? r.tf : r.tm;
    for (const name of tests) {
      const t = src.find((x) => x[0] === name);
      if (t) tags.push(`<span class="tag tp">${esc(name)} ${esc(testPriceLabel(t))}</span>`);
      else tags.push(`<span class="tag tp na">${esc(name)} 未実施</span>`);
    }
  }
  return tags.join("");
}

/** 合計と自己負担の行。タグ列の下に独立して置く（モバイルでタグに混ぜると折り返して読めないため） */
export function estimateHTML(e: Estimate) {
  if (e.missing.length) return `<span class="estline na">未実施の検査あり</span>`;
  const t = e.uncertain ? "〜" : "";
  const note = e.uncertain ? `<small>（要確認）</small>` : "";
  return `<span class="estline"><b>合計 ${fmtYen(e.total)}${t}</b><span class="copay">自己負担の目安 ${fmtYen(e.copay)}${t}</span>${note}</span>`;
}

/** 比較のピン留めボタン。状態（aria-pressed・ラベル）は compare.ts が localStorage に合わせて更新する */
export function pinHTML(r: Clinic, on = "比較中", off = "比較") {
  return `<button class="pin" type="button" data-pin="${r.n}" data-name="${esc(r.nm)}" data-on="${esc(on)}" data-off="${esc(off)}" aria-pressed="false">${esc(off)}</button>`;
}

export function rowHTML(r: Clinic, o: RowOpts = {}) {
  const g = o.g || "";
  const tests = o.tests || [];
  const est = o.est && g ? estimateHTML(estimate(r, g, tests)) : "";
  return `<li class="item k-${r.kb}" data-n="${r.n}">
    <a class="row-head" href="${clinicUrl(r.n)}">
      <span class="bar"></span>
      <span class="body">
        <span class="nm">${esc(r.nm)}</span>
        <span class="meta"><span class="city">${esc(r.ct)}</span>${esc(streetOf(r))}</span>
        <span class="tags">${tagsHTML(r, g, tests)}</span>${est}
      </span>
      <span class="chev"><span>詳細</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3.5L10.5 8 6 12.5"/></svg>
      </span>
    </a>
    ${pinHTML(r)}
  </li>`;
}
