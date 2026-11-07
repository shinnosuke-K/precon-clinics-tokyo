/* 比較ページ。?n= の機関（無ければ localStorage のピン留め）を横並びの表にする */
import { type Clinic, KBLABEL, clinicUrl, esc, hasOnline, hasWeb, streetOf, yen } from "../lib/format";
import { type Gender, estimate, fmtYen } from "../lib/estimate";
import { parseIds, resolveTests } from "../lib/query";
import { pinnedIds } from "./compare";

const GLABEL: Record<Gender, string> = { f: "女性", m: "男性" };
const el = (id: string) => document.getElementById(id)!;

const cell = (v: string | null | undefined, cls = "") => {
  const [t, c] = yen(v);
  return `<td class="y ${c} ${cls}">${esc(t)}</td>`;
};
const row = (label: string, cells: string[], cls = "") => `<tr class="${cls}"><th scope="row">${label}</th>${cells.join("")}</tr>`;
const sec = (label: string, n: number) => row(label, Array(n).fill("<td></td>"), "sec");

/** 配列の順序を保った和集合 */
function union(lists: string[][]): string[] {
  const out: string[] = [];
  for (const l of lists) for (const x of l) if (!out.includes(x)) out.push(x);
  return out;
}

function testSection(cs: Clinic[], g: Gender, selected: string[]): string {
  const src = (r: Clinic) => (g === "f" ? r.tf : r.tm);
  const names = union(cs.map((r) => src(r).map((t) => t[0])));
  if (!names.length) return "";
  let html = sec(`${GLABEL[g]}の検査メニュー`, cs.length);
  for (const name of names) {
    const sel = selected.includes(name);
    const tests = cs.map((r) => src(r).find((t) => t[0] === name) || null);
    const label = esc(name) + (sel ? ` <span class="tag tp">選択中</span>` : "");
    html += row(label, tests.map((t) => (t ? cell(t[1]) : `<td class="y na">実施なし</td>`)), sel ? "sel" : "");
    for (const sn of union(tests.map((t) => (t ? t[2].map((s) => s[0]) : [])))) {
      html += row(esc(sn), tests.map((t) => {
        const s = t?.[2].find((x) => x[0] === sn);
        return s ? cell(s[1]) : `<td class="y na">—</td>`;
      }), "sub" + (sel ? " sel" : ""));
    }
  }
  return html;
}

export function render(data: Clinic[]) {
  const p = new URLSearchParams(location.search);
  const ids = p.get("n") ? parseIds(p.get("n")) : pinnedIds().slice(0, 3);
  const cs = ids.map((n) => data.find((r) => r.n === n)).filter((r): r is Clinic => !!r);
  const g0 = p.get("g");
  const g: Gender | "" = g0 === "f" || g0 === "m" ? g0 : "";
  /* 検査名は全データから引く。比較中の機関がどこも実施していない検査も「未実施」として合計に出すため */
  const selected = g ? resolveTests(union(data.map((r) => (g === "f" ? r.tf : r.tm).map((t) => t[0]))), (p.get("t") || "").split(",")) : [];

  el("cmp-count").textContent = cs.length ? `${cs.length}件` : "";
  el("cmp-empty").hidden = cs.length > 0;
  el("cmp").hidden = cs.length === 0;
  if (!cs.length) {
    el("cmp-desc").textContent = "";
    return;
  }
  el("cmp-desc").textContent = g
    ? `見積もり条件: ${GLABEL[g]}${selected.length ? "・" + selected.map((s) => s.normalize("NFKC")).join("・") : "（検査の選択なし）"}。合計は初診料＋必須検査＋助言・相談料＋選んだ検査（再診料は含みません）。助成上限3万円を差し引いた額を自己負担の目安としています。`
    : "一覧で「費用を見積もる」から性別と検査を選ぶと、ここに合計と自己負担の目安も出ます。";

  const head = cs.map((r) => {
    const tags = [`<span class="tag kb">${KBLABEL[r.kb]}</span>`];
    if (r.sp) tags.push(`<span class="tag sp">女性ヘルスケア専門医</span>`);
    if (hasWeb(r)) tags.push(`<span class="tag">web予約</span>`);
    if (hasOnline(r)) tags.push(`<span class="tag">オンライン相談</span>`);
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.nm + " " + r.ad)}`;
    return `<th scope="col" class="k-${r.kb}"><a href="${clinicUrl(r.n)}">${esc(r.nm)}</a>${r.note ? `<span class="tag stop">受付停止中</span>` : ""}<span class="thead-meta">${esc(r.ct)}・${esc(streetOf(r).replace(r.ct, ""))} <a href="${maps}" target="_blank" rel="noopener">地図</a><br>${tags.join("")}</span></th>`;
  });

  let body = "";
  body += row("予約方法", cs.map((r) => `<td>${esc(r.rv.length ? r.rv.join("／") : "—")}</td>`));
  body += row("相談方法", cs.map((r) => `<td>${esc(r.cs.join("／"))}</td>`));
  body += row("受診対象", cs.map((r) => `<td>${KBLABEL[r.kb]}${r.sp ? "<br><small>女性ヘルスケア専門医</small>" : ""}</td>`));
  body += sec("診察料", cs.length);
  body += row("初診料", cs.map((r) => cell(r.fee[0])));
  body += row("再診料", cs.map((r) => cell(r.fee[1])));
  body += row("助言・相談料", cs.map((r) => cell(r.fee[2])));
  body += sec("必須検査", cs.length);
  for (const name of union(cs.map((r) => r.must.map((m) => m[0])))) {
    body += row(esc(name), cs.map((r) => { const m = r.must.find((x) => x[0] === name); return m ? cell(m[1]) : `<td class="y na">—</td>`; }));
  }
  for (const side of (g ? [g] : (["f", "m"] as Gender[]))) body += testSection(cs, side, selected);
  if (g) {
    const label = `合計（${GLABEL[g]}${selected.length ? "・" + selected.map((s) => esc(s.normalize("NFKC"))).join("・") : ""}）`;
    body += row(label, cs.map((r) => {
      const e = estimate(r, g, selected);
      if (e.missing.length) return `<td class="y na">未実施の検査あり<small>${esc(e.missing.join("、"))}</small></td>`;
      const t = e.uncertain ? "〜" : "";
      return `<td class="y">${fmtYen(e.total)}${t}<small>自己負担の目安 ${fmtYen(e.copay)}${t}${e.uncertain ? "（要確認）" : ""}</small></td>`;
    }), "tot");
  }

  el("cmp").innerHTML = `<table class="cmp"><thead><tr><th scope="col">項目</th>${head.join("")}</tr></thead><tbody>${body}</tbody></table>`;
}
