/**
 * Simple dark mode persistence using localStorage + DOM class toggling.
 */

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