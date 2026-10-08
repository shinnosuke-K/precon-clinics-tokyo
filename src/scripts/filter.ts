/* 一覧ページの検索・絞り込み・並び替え・費用の見積もり。状態はURLのクエリにも書き出し、詳細ページから戻っても復元される */
import { type Clinic, feeNum, hasOnline, hasWeb, norm } from "../lib/format";
import { type Estimate, type Gender, estimate } from "../lib/estimate";
import { resolveTests, slug } from "../lib/query";
import { rowHTML } from "../lib/row";

type Sort = "no" | "fee" | "total" | "name" | "new";
interface State {
  q: string;
  qn: string;
  ward: string;
  /** 見積もりの性別。空なら見積もりなし */
  g: Gender | "";
  /** 見積もりで選んだ検査名（tf/tm の名称） */
  tests: string[];
  f: boolean;
  m: boolean;
  online: boolean;
  web: boolean;
  sp: boolean;
  open: boolean;
  sort: Sort;
}
const FLAGS = ["f", "m", "online", "web", "sp", "open"] as const;
const SORTS: Sort[] = ["no", "fee", "total", "name", "new"];
const GLABEL: Record<Gender, string> = { f: "女性", m: "男性" };

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export function init(DATA: Clinic[]) {
  for (const r of DATA) (r as any)._s = norm(`${r.nm} ${r.ad} ${r.ct} ${r.tel} ${r.tel.replace(/-/g, "")}`);
  const searchText = (r: Clinic) => (r as any)._s as string;

  const S: State = { q: "", qn: "", ward: "", g: "", tests: [], f: false, m: false, online: false, web: false, sp: false, open: false, sort: "no" };
  const areaSel = el<HTMLSelectElement>("area");
  const sortSel = el<HTMLSelectElement>("sort");
  const qInput = el<HTMLInputElement>("q");
  const filters = document.querySelector(".filters")!;
  const epanel = el("epanel");
  const etoggle = el("etoggle");
  const checksOf = (g: Gender) => [...document.querySelectorAll<HTMLInputElement>(`#echecks-${g} input`)];
  const testNames = (g: Gender) => checksOf(g).map((i) => i.value);

  /* ---- URLクエリ <-> 状態 ---- */
  function readQuery() {
    const p = new URLSearchParams(location.search);
    S.q = (p.get("q") || "").trim();
    S.qn = norm(S.q);
    /* 選択肢に無い値（古いURLやタイプミス）は無視する */
    const has = (sel: HTMLSelectElement, v: string) => [...sel.options].some((o) => o.value === v);
    S.ward = has(areaSel, p.get("ward") || "") ? p.get("ward")! : "";
    for (const k of FLAGS) S[k] = p.get(k) === "1";
    const g = p.get("g");
    S.g = g === "f" || g === "m" ? g : "";
    S.tests = S.g ? resolveTests(testNames(S.g), (p.get("t") || "").split(",")) : [];
    /* 旧URL（test=f:ＡＭＨ検査）の読み替え */
    const legacy = p.get("test");
    if (!S.g && legacy && /^[fm]:/.test(legacy)) {
      const lg = legacy[0] as Gender;
      const name = legacy.slice(2);
      if (testNames(lg).includes(name)) {
        S.g = lg;
        S.tests = [name];
      }
    }
    let s = p.get("sort");
    if (s === "tfee") s = "total";
    S.sort = s && SORTS.includes(s as Sort) ? (s as Sort) : "no";
    /* 見積もり中は、その性別が受診できる機関に絞る */
    if (S.g) S[S.g] = true;
  }
  function writeQuery() {
    const p = new URLSearchParams();
    if (S.q) p.set("q", S.q);
    if (S.ward) p.set("ward", S.ward);
    if (S.g) {
      p.set("g", S.g);
      if (S.tests.length) p.set("t", S.tests.map(slug).join(","));
    }
    for (const k of FLAGS) if (S[k]) p.set(k, "1");
    if (S.sort !== "no") p.set("sort", S.sort);
    const qs = p.toString();
    const next = location.pathname + (qs ? "?" + qs : "") + location.hash;
    if (next !== location.pathname + location.search + location.hash) history.replaceState(null, "", next);
  }
  function setPanel(open: boolean) {
    epanel.hidden = !open;
    etoggle.setAttribute("aria-expanded", String(open));
    /* モバイルでは、開いている間は絞り込みバーを画面上部に固定しない（一覧が隠れるため） */
    filters.classList.toggle("eopen", open);
  }
  /* 状態をフォーム部品に反映（クエリから復元したとき・見積もりの操作のあと） */
  function syncControls() {
    qInput.value = S.q;
    for (const k of FLAGS) {
      const chip = el<HTMLButtonElement>(`c-${k}`);
      chip.setAttribute("aria-pressed", String(S[k]));
      /* 見積もり中は対応する「受診できる」を固定 */
      chip.disabled = k === S.g;
      chip.title = k === S.g ? "見積もり中は固定" : "";
    }
    sortSel.value = S.sort;
    document.querySelectorAll<HTMLInputElement>('input[name="g"]').forEach((i) => { i.checked = i.value === S.g; });
    for (const g of ["f", "m"] as Gender[]) {
      el(`echecks-${g}`).hidden = S.g !== g;
      for (const i of checksOf(g)) i.checked = S.g === g && S.tests.includes(i.value);
    }
    el("ehint").hidden = !!S.g;
    el("esum").textContent = S.g ? `（${GLABEL[S.g]}・${S.tests.length}検査）` : "";
  }

  /* エリア以外の条件。エリアごとの件数表示の再計算にも使う */
  function matchBase(r: Clinic) {
    if (S.f && !(r.kb === "both" || r.kb === "f")) return false;
    if (S.m && !(r.kb === "both" || r.kb === "m")) return false;
    if (S.online && !hasOnline(r)) return false;
    if (S.web && !hasWeb(r)) return false;
    if (S.sp && !r.sp) return false;
    if (S.open && r.note) return false;
    if (S.qn && !searchText(r).includes(S.qn)) return false;
    return true;
  }
  const match = (r: Clinic) => (!S.ward || r.ct === S.ward) && matchBase(r);

  /* 見積もりは render ごとに計算し直す（並び替えと描画で同じ結果を使う） */
  let estCache = new Map<number, Estimate>();
  function estOf(r: Clinic): Estimate {
    let e = estCache.get(r.n);
    if (!e) {
      e = estimate(r, S.g as Gender, S.tests);
      estCache.set(r.n, e);
    }
    return e;
  }

  function sortRows(rows: Clinic[]) {
    const s = S.sort;
    if (s === "fee") return rows.sort((a, b) => feeNum(a) - feeNum(b) || a.n - b.n);
    if (s === "total") {
      /* 未実施の検査がある機関は末尾。その中は登録順 */
      const key = (r: Clinic) => { const e = estOf(r); return e.missing.length ? Infinity : e.total; };
      return rows.sort((a, b) => key(a) - key(b) || a.n - b.n);
    }
    if (s === "name") return rows.sort((a, b) => a.nm.localeCompare(b.nm, "ja"));
    if (s === "new") return rows.sort((a, b) => b.dt.localeCompare(a.dt) || b.n - a.n);
    return rows.sort((a, b) => a.n - b.n);
  }

  function render() {
    estCache = new Map();
    if (S.sort === "total" && !S.g) S.sort = "no";
    const ot = el<HTMLOptionElement>("o-total");
    ot.hidden = ot.disabled = !S.g;
    sortSel.value = S.sort;
    const rows = sortRows(DATA.filter(match));
    el("count").textContent = String(rows.length);
    const estDesc = S.g
      ? `見積もり: ${GLABEL[S.g]}` + (S.tests.length ? `・${S.tests[0].normalize("NFKC")}` + (S.tests.length > 1 ? `＋${S.tests.length - 1}` : "") : "")
      : "";
    const on = [S.ward, S.f && "女性可", S.m && "男性可", S.online && "オンライン相談", S.web && "web予約", S.sp && "専門医在籍", S.open && "受付中のみ", S.q && `「${S.q}」`, estDesc].filter(Boolean);
    el("filterdesc").textContent = on.length ? "（" + on.join("・") + "）" : "";
    el("reset").hidden = !on.length;
    const nf = [S.ward, ...FLAGS.map((k) => S[k])].filter(Boolean).length;
    el("fcount").textContent = nf ? `（${nf}）` : "";
    el("list").innerHTML = rows.map((r) => rowHTML(r, { g: S.g, tests: S.tests, est: true })).join("");
    el("empty").hidden = rows.length > 0;
    el("list").hidden = rows.length === 0;
    document.dispatchEvent(new CustomEvent("rows:rendered"));
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
  etoggle.addEventListener("click", () => setPanel(epanel.hidden));
  epanel.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === "g") {
      S.g = t.value as Gender;
      S.tests = [];
      /* 切り替えた性別の「受診できる」だけを残す（前の性別のチップが残ると両対応の機関だけになる） */
      S.f = S.g === "f";
      S.m = S.g === "m";
    } else if (t.type === "checkbox" && S.g) {
      S.tests = checksOf(S.g).filter((i) => i.checked).map((i) => i.value);
    }
    syncControls();
    render();
  });
  el("eclear").addEventListener("click", () => {
    S.g = "";
    S.tests = [];
    syncControls();
    setPanel(false);
    render();
  });
  el("reset").addEventListener("click", () => {
    Object.assign(S, { q: "", qn: "", ward: "", g: "", tests: [], f: false, m: false, online: false, web: false, sp: false, open: false });
    syncControls();
    setPanel(false);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  /* 戻る・進むでクエリが変わったときも追従する */
  window.addEventListener("popstate", () => { readQuery(); syncControls(); setPanel(!!S.g); render(); });

  readQuery();
  syncControls();
  /* 復元した絞り込みがあれば、折りたたみを開いて見えるようにする */
  if ([S.ward, ...FLAGS.map((k) => S[k])].some(Boolean)) {
    filters.classList.add("open");
    el("ftoggle").setAttribute("aria-expanded", "true");
  }
  setPanel(!!S.g);
  render();
}
