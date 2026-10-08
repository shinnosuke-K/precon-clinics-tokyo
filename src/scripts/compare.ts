/* 比較のピン留め。localStorage に最大3件を保存し、全ページの [data-pin] ボタンと画面下のバーを同期する */
import { url } from "../lib/format";

export interface Pin {
  n: number;
  nm: string;
}
const KEY = "compare";
const MAX = 3;
let mem: Pin[] = [];

function load(): Pin[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(v)) mem = v.filter((p) => p && Number.isInteger(p.n) && typeof p.nm === "string").slice(0, MAX);
  } catch {
    /* localStorage が使えない環境ではメモリ上の配列だけで動く */
  }
  return mem;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(mem));
  } catch {}
}
export const pinned = () => mem;
export const pinnedIds = () => mem.map((p) => p.n);

/** 追加できなければ false（上限）。既にあれば外す */
function toggle(n: number, nm: string): boolean {
  const i = mem.findIndex((p) => p.n === n);
  if (i >= 0) mem.splice(i, 1);
  else if (mem.length >= MAX) return false;
  else mem.push({ n, nm });
  save();
  return true;
}

const el = (id: string) => document.getElementById(id);
let msgTimer: ReturnType<typeof setTimeout>;
function flash(text: string) {
  const m = el("cbar-msg");
  if (!m) return;
  m.textContent = text;
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => { m.textContent = ""; }, 2500);
}

/** ボタンとバーを現在の選択に合わせる */
export function sync() {
  const ids = pinnedIds();
  document.querySelectorAll<HTMLButtonElement>("[data-pin]").forEach((b) => {
    const on = ids.includes(Number(b.dataset.pin));
    b.setAttribute("aria-pressed", String(on));
    b.textContent = on ? b.dataset.on || "比較中" : b.dataset.off || "比較";
  });
  const bar = el("cbar");
  if (!bar) return;
  bar.hidden = mem.length === 0;
  document.body.classList.toggle("has-cbar", mem.length > 0);
  el("cbar-count")!.textContent = String(mem.length);
  const names = el("cbar-names")!;
  names.textContent = "";
  names.append("比較中: ");
  mem.forEach((p, i) => {
    if (i) names.append("、");
    const b = document.createElement("b");
    b.textContent = p.nm;
    names.append(b);
  });
  /* 比較ページへ。トップで見積もり中なら g/t も引き継ぐ */
  const cur = new URLSearchParams(location.search);
  const q = new URLSearchParams();
  q.set("n", ids.join(","));
  if (cur.get("g")) {
    q.set("g", cur.get("g")!);
    if (cur.get("t")) q.set("t", cur.get("t")!);
  }
  (el("cbar-go") as HTMLAnchorElement).href = url("compare/") + "?" + q.toString();
}

load();
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-pin]");
  if (!b) return;
  if (!toggle(Number(b.dataset.pin), b.dataset.name || "")) flash(`比較は${MAX}件までです`);
  sync();
});
el("cbar-clear")?.addEventListener("click", () => {
  mem = [];
  save();
  sync();
});
document.addEventListener("rows:rendered", sync);
sync();
