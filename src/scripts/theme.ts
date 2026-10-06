/* ヘッダーのボタンでテーマを切り替える。初期値は Layout.astro のインラインスクリプトが描画前に決めている */
const mqDark = matchMedia("(prefers-color-scheme: dark)");
const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!;
const btn = document.getElementById("themebtn")!;
let themeStored: string | null = null;
try {
  themeStored = localStorage.getItem("theme");
} catch {}

function applyTheme(mode: "dark" | "light") {
  document.documentElement.dataset.theme = mode;
  themeMeta.content = mode === "dark" ? "#10191d" : "#0f7c8a";
  btn.textContent = mode === "dark" ? "☀︎" : "☾";
  btn.setAttribute("aria-label", mode === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え");
  btn.title = btn.getAttribute("aria-label")!;
}

applyTheme(
  themeStored === "dark" || themeStored === "light" ? themeStored : mqDark.matches ? "dark" : "light",
);
mqDark.addEventListener("change", (e) => {
  if (!themeStored) applyTheme(e.matches ? "dark" : "light");
});
btn.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  themeStored = next;
  try {
    localStorage.setItem("theme", next);
  } catch {}
  applyTheme(next);
});
