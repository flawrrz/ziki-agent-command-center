export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "ziki-agent-command-center:theme";

export const THEME_COLORS: Record<Theme, string> = {
  dark: "#070f22",
  light: "#f5f7fb",
};

export function readTheme(): Theme {
  if (typeof document === "undefined") return "light";

  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function writeTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[theme]);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private browsing: the theme still applies for this page view.
  }
}

export const THEME_INIT_SCRIPT = `(function(){
var theme="light";
try{var saved=window.localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(saved==="light"||saved==="dark")theme=saved;}catch(e){}
document.documentElement.dataset.theme=theme;
var meta=document.querySelector('meta[name="theme-color"]');
if(meta)meta.setAttribute("content",theme==="light"?"${THEME_COLORS.light}":"${THEME_COLORS.dark}");
})();`;
