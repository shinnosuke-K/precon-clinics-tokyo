/* 一覧1行のHTML。ビルド時（index.astro）とブラウザ側（filter.ts）の両方で使うので文字列で組む */
import { type Clinic, KBLABEL, clinicUrl, esc, hasOnline, hasWeb, streetOf, yen } from "./format";

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

export function tagsHTML(r: Clinic, test = "") {
  const tags = [`<span class="tag kb">${KBLABEL[r.kb]}</span>`];
  if (r.note) tags.push(`<span class="tag stop">受付停止中</span>`);
  if (r.sp) tags.push(`<span class="tag sp">女性ヘルスケア専門医</span>`);
  if (hasOnline(r)) tags.push(`<span class="tag">オンライン相談</span>`);
  if (hasWeb(r)) tags.push(`<span class="tag">web予約</span>`);
  tags.push(`<span class="tag">初診 ${priceTag(r.fee[0])}</span>`);
  const t = testOf(r, test);
  if (t) tags.push(`<span class="tag tp">${esc(test.slice(2))} ${priceTag(t[1])}</span>`);
  return tags.join("");
}

export function rowHTML(r: Clinic, test = "") {
  return `<li class="item k-${r.kb}" data-n="${r.n}">
    <a class="row-head" href="${clinicUrl(r.n)}">
      <span class="bar"></span>
      <span class="body">
        <span class="nm">${esc(r.nm)}</span>
        <span class="meta"><span class="city">${esc(r.ct)}</span>${esc(streetOf(r))}</span>
        <span class="tags">${tagsHTML(r, test)}</span>
      </span>
      <span class="chev"><span>詳細</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3.5L10.5 8 6 12.5"/></svg>
      </span>
    </a>
  </li>`;
}
