/**
 * Theme + dark mode persistence using localStorage + DOM class toggling.
 *
 * Cosmetic themes can force a color-scheme mode (dark or light) that overrides
 * the user's manual dark-mode toggle:
 *   - gold       → dark
 *   - gamer      → light
 *   - pink       → light
 *   - lilac_bloom → light
 * The default theme respects the user's stored preference.
 */

export const THEME_MODE_LOCK = {
  gold: "dark",
  gamer: "light",
  pink: "light",
  lilac_bloom: "light",
  royal_batik: "dark",
};

/**
 * Cosmetic theme cache. Written here and read synchronously at boot (see the
 * inline script in index.html) so a returning player's theme is painted on the
 * very first frame instead of after the profile request resolves.
 */
export const THEME_CACHE_KEY = "telesales_active_theme";

export function getCachedTheme() {
  try {
    return localStorage.getItem(THEME_CACHE_KEY) || "default";
  } catch {
    return "default";
  }
}

function cacheTheme(themeId) {
  try {
    localStorage.setItem(THEME_CACHE_KEY, themeId || "default");
  } catch {}
}

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
  cacheTheme(themeId);
}