/* 一覧ページの検索・絞り込み・並び替え。状態はURLのクエリにも書き出し、詳細ページから戻っても復元される */
import { type Clinic, amtNum, feeNum, hasOnline, hasWeb, norm } from "../lib/format";
import { rowHTML, testOf } from "../lib/row";

type Sort = "no" | "fee" | "tfee" | "name" | "new";
interface State {
  q: string;
  qn: string;
  ward: string;
  test: string;
  f: boolean;
  m: boolean;
  online: boolean;
  web: boolean;
  sp: boolean;
  open: boolean;
  sort: Sort;
}
const FLAGS = ["f", "m", "online", "web", "sp", "open"] as const;
const SORTS: Sort[] = ["no", "fee", "tfee", "name", "new"];

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export function init(DATA: Clinic[]) {
  for (const r of DATA) (r as any)._s = norm(`${r.nm} ${r.ad} ${r.ct} ${r.tel} ${r.tel.replace(/-/g, "")}`);
  const searchText = (r: Clinic) => (r as any)._s as string;

  const S: State = { q: "", qn: "", ward: "", test: "", f: false, m: false, online: false, web: false, sp: false, open: false, sort: "no" };
  const areaSel = el<HTMLSelectElement>("area");
  const testSel = el<HTMLSelectElement>("test");
  const sortSel = el<HTMLSelectElement>("sort");
  const qInput = el<HTMLInputElement>("q");
  const filters = document.querySelector(".filters")!;

  /* ---- URLクエリ <-> 状態 ---- */
  function readQuery() {
    const p = new URLSearchParams(location.search);
    S.q = (p.get("q") || "").trim();
    S.qn = norm(S.q);
    /* 選択肢に無い値（古いURLやタイプミス）は無視する */
    const has = (sel: HTMLSelectElement, v: string) => [...sel.options].some((o) => o.value === v);
    S.ward = has(areaSel, p.get("ward") || "") ? p.get("ward")! : "";
    S.test = has(testSel, p.get("test") || "") ? p.get("test")! : "";
    for (const k of FLAGS) S[k] = p.get(k) === "1";
    const s = p.get("sort") as Sort | null;
    S.sort = s && SORTS.includes(s) ? s : "no";
  }
  function writeQuery() {
    const p = new URLSearchParams();
    if (S.q) p.set("q", S.q);
    if (S.ward) p.set("ward", S.ward);
    if (S.test) p.set("test", S.test);
    for (const k of FLAGS) if (S[k]) p.set(k, "1");
    if (S.sort !== "no") p.set("sort", S.sort);
    const qs = p.toString();
    const next = location.pathname + (qs ? "?" + qs : "") + location.hash;
    if (next !== location.pathname + location.search + location.hash) history.replaceState(null, "", next);
  }
  /* 状態をフォーム部品に反映（クエリから復元したとき用） */
  function syncControls() {
    qInput.value = S.q;
    for (const k of FLAGS) el(`c-${k}`).setAttribute("aria-pressed", String(S[k]));
    sortSel.value = S.sort;
  }

  /* エリア以外の条件。エリアごとの件数表示の再計算にも使う */
  function matchBase(r: Clinic) {
    if (S.f && !(r.kb === "both" || r.kb === "f")) return false;
    if (S.m && !(r.kb === "both" || r.kb === "m")) return false;
    if (S.online && !hasOnline(r)) return false;
    if (S.web && !hasWeb(r)) return false;
    if (S.sp && !r.sp) return false;
    if (S.open && r.note) return false;
    if (S.test && !testOf(r, S.test)) return false;
    if (S.qn && !searchText(r).includes(S.qn)) return false;
    return true;
  }
  const match = (r: Clinic) => (!S.ward || r.ct === S.ward) && matchBase(r);

  function sortRows(rows: Clinic[]) {
    const s = S.sort;
    if (s === "fee") return rows.sort((a, b) => feeNum(a) - feeNum(b) || a.n - b.n);
    if (s === "tfee") return rows.sort((a, b) => amtNum(testOf(a, S.test)![1]) - amtNum(testOf(b, S.test)![1]) || a.n - b.n);
    if (s === "name") return rows.sort((a, b) => a.nm.localeCompare(b.nm, "ja"));
    if (s === "new") return rows.sort((a, b) => b.dt.localeCompare(a.dt) || b.n - a.n);
    return rows.sort((a, b) => a.n - b.n);
  }

  function render() {
    if (S.sort === "tfee" && !S.test) S.sort = "no";
    const ot = el<HTMLOptionElement>("o-tfee");
    ot.hidden = ot.disabled = !S.test;
    sortSel.value = S.sort;
    const rows = sortRows(DATA.filter(match));
    el("count").textContent = String(rows.length);
    const on = [S.ward, S.test && S.test.slice(2), S.f && "女性可", S.m && "男性可", S.online && "オンライン相談", S.web && "web予約", S.sp && "専門医在籍", S.open && "受付中のみ", S.q && `「${S.q}」`].filter(Boolean);
    el("filterdesc").textContent = on.length ? "（" + on.join("・") + "）" : "";
    el("reset").hidden = !on.length;
    const nf = [S.ward, S.test, ...FLAGS.map((k) => S[k])].filter(Boolean).length;
    el("fcount").textContent = nf ? `（${nf}）` : "";
    el("list").innerHTML = rows.map((r) => rowHTML(r, S.test)).join("");
    el("empty").hidden = rows.length > 0;
    el("list").hidden = rows.length === 0;
    /* エリアの件数・バーを、エリア以外の条件を適用した状態に合わせる */
    const wc: Record<string, number> = {};
    for (const r of DATA) if (matchBase(r)) wc[r.ct] = (wc[r.ct] || 0) + 1;
    const wmax = Math.max(1, ...Object.values(wc));
    document.querySelectorAll<HTMLAnchorElement>(".ward").forEach((b) => {
      const w = b.dataset.ward!;
      const c = wc[w] || 0;
      b.querySelector(".wc")!.textContent = String(c);
      b.querySelector<HTMLElement>(".wb i")!.style.width = ((c / wmax) * 100).toFixed(1) + "%";
      b.classList.toggle("z", !c);
      if (w === S.ward) b.setAttribute("aria-current", "true");
      else b.removeAttribute("aria-current");
    });
    for (const o of areaSel.options) if (o.value) o.textContent = `${o.value}（${wc[o.value] || 0}）`;
    areaSel.value = S.ward;
    testSel.value = S.test;
    writeQuery();
  }

  /* ---- events ---- */
  el("wards").addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest(".wtoggle")) {
      el("wards").classList.add("expanded");
      return;
    }
    const b = t.closest<HTMLElement>(".ward");
    if (!b) return;
    /* エリアは区ページへのリンクだが、JSが動くときはその場で絞り込む */
    e.preventDefault();
    S.ward = S.ward === b.dataset.ward ? "" : b.dataset.ward!;
    render();
  });
  areaSel.addEventListener("change", () => { S.ward = areaSel.value; render(); });
  testSel.addEventListener("change", () => { S.test = testSel.value; render(); });
  sortSel.addEventListener("change", () => { S.sort = sortSel.value as Sort; render(); });
  let timer: ReturnType<typeof setTimeout>;
  qInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => { S.q = qInput.value.trim(); S.qn = norm(S.q); render(); }, 160);
  });
  el("ftoggle").addEventListener("click", () => {
    const open = filters.classList.toggle("open");
    el("ftoggle").setAttribute("aria-expanded", String(open));
  });
  for (const k of FLAGS) {
    el(`c-${k}`).addEventListener("click", () => {
      S[k] = !S[k];
      el(`c-${k}`).setAttribute("aria-pressed", String(S[k]));
      render();
    });
  }
  el("reset").addEventListener("click", () => {
    Object.assign(S, { q: "", qn: "", ward: "", test: "", f: false, m: false, online: false, web: false, sp: false, open: false });
    syncControls();
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  /* 戻る・進むでクエリが変わったときも追従する */
  window.addEventListener("popstate", () => { readQuery(); syncControls(); render(); });

  readQuery();
  syncControls();
  /* 復元した絞り込みがあれば、折りたたみを開いて見えるようにする */
  if ([S.ward, S.test, ...FLAGS.map((k) => S[k])].some(Boolean)) {
    filters.classList.add("open");
    el("ftoggle").setAttribute("aria-expanded", "true");
  }
  render();
}
