// Appliquer le choix avant le premier affichage pour éviter un flash du mauvais thème.
(() => {
  let theme;
  try {
    theme = localStorage.getItem("ciugb-theme");
  } catch {}
  if (theme !== "light" && theme !== "dark")
    theme = matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#101010" : "#f8f6f3");
})();
