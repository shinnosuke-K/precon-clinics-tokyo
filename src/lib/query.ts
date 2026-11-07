/* URL クエリまわりの純粋関数。format.ts（import.meta.env を使う）に依存しないので Node で単体テストできる */

/** 検査名を URL 用に直す。全角英数は半角にし、括弧や空白は「-」に置き換える（例: ＡＭＨ検査 → AMH検査） */
export const slug = (s: string) =>
  s.normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");

/** t= のスラッグを、その性別の検査名に引き直す。順序は指定順、存在しないものと重複は捨てる */
export function resolveTests(names: string[], want: string[]): string[] {
  const out: string[] = [];
  for (const w of want) {
    const name = names.find((n) => slug(n) === w);
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

/** n= を登録番号の配列にする。数値以外・重複・0以下は捨て、最大 max 件 */
export function parseIds(s: string | null | undefined, max = 3): number[] {
  const out: number[] = [];
  for (const part of (s || "").split(",")) {
    const n = Number(part.trim());
    if (!Number.isInteger(n) || n <= 0 || out.includes(n)) continue;
    out.push(n);
    if (out.length >= max) break;
  }
  return out;
}
