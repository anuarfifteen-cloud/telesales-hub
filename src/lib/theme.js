/**
 * Theme + dark mode persistence using localStorage + DOM class toggling.
 *
 * Cosmetic themes can force a color-scheme mode (dark or light) that overrides
 * the user's manual dark-mode toggle:
 *   - gold  → dark
 *   - gamer → light
 *   - pink  → light
 * The default theme respects the user's stored preference.
 */

export const THEME_MODE_LOCK = {
  gold: "dark",
  gamer: "light",
  pink: "light",
};

export function getStoredTheme() {
  try {
    return localStorage.getItem("theme") === "dark";
  } catch {
    return false;
  }
}

export function applyTheme(isDark) {
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  try {
    localStorage.setItem("theme", isDark ? "dark" : "light");
  } catch {}
}

export function applyActiveTheme(themeId, darkPref) {
  const locked = THEME_MODE_LOCK[themeId];
  const isDark = locked
    ? locked === "dark"
    : darkPref !== undefined
    ? darkPref
    : getStoredTheme();
  applyTheme(isDark);
  document.documentElement.setAttribute("data-theme", themeId || "default");
}