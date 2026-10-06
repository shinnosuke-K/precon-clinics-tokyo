export type Test = [name: string, amount: string, subs: [string, string][]];

export interface Clinic {
  n: number;
  nm: string;
  note: string;
  ct: string;
  ad: string;
  tel: string;
  dt: string;
  as: string;
  kb: "both" | "f" | "m";
  kb2: "both" | "f" | "m" | "";
  sp: boolean;
  rv: string[];
  cs: string[];
  fee: [string, string, string];
  must: [string, string][];
  tm: Test[];
  tf: Test[];
}

export const KBLABEL = { both: "男女どちらも", f: "女性のみ", m: "男性のみ" } as const;

/** base を含むサイト内URL。path は先頭スラッシュなし（"" でトップ） */
export const url = (path: string) => import.meta.env.BASE_URL.replace(/\/$/, "") + "/" + path;

export const clinicUrl = (n: number) => url(`c/${n}/`);

export const yen = (v: string | null | undefined): [string, string] => {
  if (v === "" || v == null) return ["—", "na"];
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return [s === "0" ? "無料" : "¥" + Number(s).toLocaleString(), ""];
  return [s, "na"];
};

const num = (s: string) => {
  const m = s.replace(/[,，]/g, "").match(/\d+/);
  return m ? +m[0] : Infinity;
};
export const feeNum = (r: Clinic) => num(String(r.fee[0] || ""));
export const amtNum = (a: string | null | undefined) => num(String(a == null ? "" : a));

export const esc = (s: unknown) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/* 全角→半角・大文字→小文字・カタカナ→ひらがなに揃えて表記ゆれを吸収する */
export const norm = (s: string) =>
  String(s)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

export const hasOnline = (r: Clinic) => r.cs.includes("オンライン");
export const hasWeb = (r: Clinic) => r.rv.some((x) => x.startsWith("web"));
export const streetOf = (r: Clinic) => r.ad.replace(/^東京都/, "");

/** JSON-LD を <script> に埋めるための文字列化（</script> 対策） */
export const jsonld = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
