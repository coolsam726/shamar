import type { ShamarTheme, ThemeTailwindSource } from '@shamar/core';
import {
  TAILWIND_CDN_SCRIPT,
  assertCompiledThemeOrDevFallback,
  brandColorScaleCss,
  brandColorThemeCss,
  escapeThemeAttr,
  getThemeAssetsRoot,
  holdColor,
  isThemeAsset,
  readUncompiledThemeCss,
  resolvePanelTheme,
  resolveThemeStylesheetHref,
  resolveThemeTailwindSource,
  themeGoogleFontsHref,
  themeUsesRuntime,
} from '@shamar/core';

export interface ThemeHeadOptions {
  /** Panel URL prefix (`/admin`). Used for the local Tailwind runtime script. */
  basePath?: string;
  /** App root with `public/` + `resources/` (defaults to {@link getThemeAssetsRoot}). */
  appRoot?: string;
  /** Auth / guest document (no dark hold background). */
  authDocument?: boolean;
  /** Override `NODE_ENV` for CDN / production guards (tests). */
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}

export interface ThemeHeadLinks {
  /** Google Fonts stylesheet from theme.googleFonts(), if any. */
  fontUrl?: string;
  fontPreconnect: boolean;
  /**
   * Theme stylesheet href for `<link rel="stylesheet">`.
   * Omitted when the Tailwind runtime compiles the sheet instead.
   */
  stylesheetHref?: string;
  /** Theme id for debugging / data attributes. */
  themeId: string;
  /** Raw `theme.useTailwind()` flag. */
  useTailwind: boolean;
  /**
   * True when the browser Tailwind runtime + hide-until-compile path is active
   * (explicit `useTailwind()`, or missing compiled asset in development).
   */
  runtime: boolean;
  /** `compiled` | `local` | `cdn` | `none` — how utilities are loaded. */
  tailwindSource: ThemeTailwindSource;
  /**
   * HTML injected early in `<head>`: pending class + hold style + Tailwind
   * sources / sync loader / runtime script (Firefly `themeHeadExtra` runtime half).
   */
  runtimeHeadHtml: string;
  /** Reveal script before `</body>` when `runtime` is true. */
  revealHtml: string;
  /** Absolute URL/path to the Tailwind browser runtime (local or CDN). */
  tailwindScriptSrc: string;
}

const TAILWIND_SCRIPT_SUFFIX = '/assets/tailwind.js';

/**
 * Head links + runtime snippets derived from the panel theme
 * (Firefly `withThemeStylesheet` / `themeHeadExtra` parity).
 *
 * Prefer compiled `themeAsset()` → `<link rel="stylesheet">`. Missing compile
 * falls back to {@link TAILWIND_CDN_SCRIPT} in development only; production throws.
 */
export function resolveThemeHead(
  themeInput?: ShamarTheme | null,
  options: ThemeHeadOptions = {},
): ThemeHeadLinks {
  const theme = resolvePanelTheme(themeInput);
  const root = options.appRoot ?? getThemeAssetsRoot();
  const env = options.env ?? process.env;
  assertCompiledThemeOrDevFallback(theme, root, env);

  const basePath = (options.basePath ?? '').replace(/\/+$/, '');
  const authDocument = Boolean(options.authDocument);
  const tailwindSource = resolveThemeTailwindSource(theme, root, env);
  const runtime = themeUsesRuntime(theme, root, env);
  const fontUrl = themeGoogleFontsHref(theme.googleFonts()) ?? undefined;
  const raw = theme.stylesheet()?.trim() ?? '';
  const asset = isThemeAsset(raw);
  const stylesheetHref =
    raw && !runtime ? (resolveThemeStylesheetHref(raw) ?? undefined) : undefined;

  const localScriptSrc = `${basePath}${TAILWIND_SCRIPT_SUFFIX}`;
  const tailwindScriptSrc =
    tailwindSource === 'cdn' ? TAILWIND_CDN_SCRIPT : localScriptSrc;
  let runtimeHeadHtml = '';
  let revealHtml = '';

  if (runtime) {
    runtimeHeadHtml = [
      themeHold(theme, authDocument),
      tailwindHead(
        asset ? '' : raw,
        asset ? readUncompiledThemeCss(raw, root) : '',
        tailwindScriptSrc,
      ),
    ].join('\n');
    revealHtml = themePaintScript();
  }

  return {
    fontUrl,
    fontPreconnect: Boolean(fontUrl),
    stylesheetHref,
    themeId: theme.id(),
    useTailwind: theme.useTailwind(),
    runtime,
    tailwindSource,
    runtimeHeadHtml,
    revealHtml,
    tailwindScriptSrc,
  };
}

/**
 * Hides the root until the reveal script shows it (Firefly `themeHold`).
 * Dark panel also paints token darkSurface so a blocked parser cannot flash light.
 */
function themeHold(theme: ShamarTheme, authDocument: boolean): string {
  const rules = ['html.shamar-theme-pending{visibility:hidden}'];
  if (!authDocument) {
    rules.push(
      `html.dark.shamar-theme-pending{background:${holdColor(theme.tokens().darkSurface)}}`,
    );
  }
  return `<script>(function(){document.documentElement.classList.add("shamar-theme-pending");})();</script>
<style id="shamar-theme-hold">${rules.join('')}</style>`;
}

function tailwindSource(): string {
  return `<style>
${brandColorScaleCss()}
</style>
<style type="text/tailwindcss">@import "tailwindcss/theme";
@import "tailwindcss/utilities";
${brandColorThemeCss()}
html { --ff-theme-compiled: 1; --shamar-theme-compiled: 1; }</style>`;
}

function inlineTailwindSheet(userCss: string): string {
  if (!userCss) return '';
  const css = userCss.replace(/<\//g, '<\\/');
  return `<style type="text/tailwindcss" data-shamar-theme-sheet data-ff-theme-sheet>${css}</style>`;
}

/**
 * Blocking runtime in the head (Firefly `tailwindHead`).
 * Sync XHR injects `@apply` before the browser build's first microtask when possible.
 */
function tailwindHead(href: string, userCss: string, scriptSrc: string): string {
  const source = tailwindSource();
  const script = `<script src="${escapeThemeAttr(scriptSrc)}"></script>`;
  const inline = inlineTailwindSheet(userCss);
  if (!href) {
    if (!inline) return `${source}\n${script}`;
    return `${source}\n${inline}\n${script}`;
  }
  const loader = `<script data-shamar-tailwind-href="${escapeThemeAttr(href)}" data-ff-tailwind-href="${escapeThemeAttr(href)}">(function(){var href=document.currentScript.getAttribute("data-shamar-tailwind-href")||document.currentScript.getAttribute("data-ff-tailwind-href");if(!href)return;document.documentElement.setAttribute("data-shamar-theme-href",href);document.documentElement.setAttribute("data-ff-theme-href",href);function inject(css){var el=document.createElement("style");el.setAttribute("type","text/tailwindcss");el.setAttribute("data-shamar-theme-sheet","");el.setAttribute("data-ff-theme-sheet","");el.textContent=css;document.head.appendChild(el);}var synced=false;try{var xhr=new XMLHttpRequest();xhr.open("GET",href,false);xhr.send(null);if(xhr.status>=200&&xhr.status<300){inject(xhr.responseText);document.documentElement.setAttribute("data-shamar-theme-sync","");document.documentElement.setAttribute("data-ff-theme-sync","");synced=true;}}catch(e){}if(!synced){fetch(href,{credentials:"same-origin"}).then(function(r){if(!r.ok)throw new Error("theme");return r.text();}).then(inject).catch(function(){document.documentElement.setAttribute("data-shamar-theme-failed","");document.documentElement.setAttribute("data-ff-theme-failed","");document.head.appendChild(document.createComment("shamar-theme-failed"));});}})();</script>`;
  return `${source}\n${loader}\n${script}`;
}

/**
 * Shows the document once the generated sheet contains `--ff-theme-compiled`
 * / `--shamar-theme-compiled` (Firefly `themePaintScript`).
 */
function themePaintScript(): string {
  return `<script data-shamar-theme-reveal data-ff-theme-reveal>(function(){var root=document.documentElement;if(!root.classList.contains("shamar-theme-pending")&&!root.classList.contains("ff-theme-pending"))return;var shown=false;function generated(){var nodes=document.head?document.head.querySelectorAll("style"):[];var last=null;for(var i=0;i<nodes.length;i++){var s=nodes[i];if(s.getAttribute("type")==="text/tailwindcss")continue;if(s.id==="shamar-theme-hold"||s.id==="ff-theme-hold")continue;last=s;}return last;}function hasSheet(){return !!document.head.querySelector("style[data-shamar-theme-sheet],style[data-ff-theme-sheet]");}var sheetCompiled=root.hasAttribute("data-shamar-theme-sync")||root.hasAttribute("data-ff-theme-sync")||!(root.hasAttribute("data-shamar-theme-href")||root.hasAttribute("data-ff-theme-href"));function compiled(){if(root.hasAttribute("data-shamar-theme-failed")||root.hasAttribute("data-ff-theme-failed"))return true;if((root.hasAttribute("data-shamar-theme-href")||root.hasAttribute("data-ff-theme-href"))&&!hasSheet())return false;if(!sheetCompiled)return false;var out=generated();if(!out)return false;var text=out.textContent||"";return text.indexOf("--ff-theme-compiled")!==-1||text.indexOf("--shamar-theme-compiled")!==-1;}function show(force){if(shown)return;if(!force&&!compiled())return;shown=true;root.style.visibility="visible";}if(compiled()){show();return;}var obs=new MutationObserver(function(records){var text=false;for(var i=0;i<records.length;i++){var rec=records[i];if(rec.type!=="characterData")continue;var node=rec.target;var el=node&&node.nodeType===3?node.parentNode:node;if(!el||el.id==="shamar-theme-hold"||el.id==="ff-theme-hold")continue;if(el.getAttribute&&el.getAttribute("type")==="text/tailwindcss")continue;if(el.tagName==="STYLE")text=true;}if(root.hasAttribute("data-shamar-theme-failed")||root.hasAttribute("data-ff-theme-failed"))sheetCompiled=true;if(hasSheet()&&text)sheetCompiled=true;if(compiled()){obs.disconnect();show();}});obs.observe(document.head,{childList:true,subtree:true,characterData:true});obs.observe(root,{attributes:true,attributeFilter:["data-shamar-theme-failed","data-ff-theme-failed"]});setTimeout(function(){obs.disconnect();show(true);},4000);})();</script>`;
}
