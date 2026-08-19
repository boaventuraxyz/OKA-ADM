import { getThemeByKey } from "./registry";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildThemeHtmlBlueprint(themeKey: string, paletteKey: string) {
  const theme = getThemeByKey(themeKey);
  if (!theme) throw new Error("Tema não encontrado.");
  const option = theme.paletteOptions.find((item) => item.key === paletteKey);
  if (!option) throw new Error("Paleta não encontrada para este tema.");

  const fields = theme.sections.map((section) => {
    const content = section.fields.map((field) =>
      '      <div class="campaign-field" data-field="' + field.key + '">{{' + field.key + "}}</div>"
    ).join("\n");
    return '    <section data-section="' + escapeHtml(section.id) + '">\n      <h2>' +
      escapeHtml(section.title) + "</h2>\n" + content + "\n    </section>";
  }).join("\n\n");
  const colors = option.palette;

  return [
    "<!doctype html>",
    '<html lang="pt-BR">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    "  <title>{{titulo}}</title>",
    "  <style>",
    "    :root {",
    "      --theme-background: " + colors.background + ";",
    "      --theme-surface: " + colors.surface + ";",
    "      --theme-text: " + colors.text + ";",
    "      --theme-accent: " + colors.accent + ";",
    "      --theme-secondary: " + colors.secondary + ";",
    "    }",
    "    * { box-sizing: border-box; }",
    "    body { margin: 0; background: var(--theme-background); color: var(--theme-text); font: 16px/1.6 system-ui, sans-serif; }",
    "    main { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: clamp(32px, 7vw, 96px) 0; }",
    "    section { margin-top: 24px; border-radius: 24px; background: var(--theme-surface); padding: clamp(24px, 5vw, 56px); }",
    "    h1, h2 { line-height: 1.08; letter-spacing: -0.025em; }",
    "    h1 { max-width: 18ch; font-size: clamp(2.4rem, 7vw, 5.8rem); }",
    "    h2 { color: var(--theme-accent); }",
    "    .campaign-field:empty { display: none; }",
    "    .campaign-cta { display: inline-flex; margin-top: 24px; border: 0; border-radius: 999px; background: var(--theme-accent); color: var(--theme-background); padding: 14px 22px; font-weight: 800; }",
    "  </style>",
    "</head>",
    '<body data-theme="' + escapeHtml(theme.key) + '" data-palette="' + escapeHtml(option.key) + '">',
    "  <main>",
    "    <header>",
    "      <h1>{{titulo}}</h1>",
    "      <p>{{descricao}}</p>",
    "    </header>",
    "",
    fields,
    "",
    '    <button class="campaign-cta" type="button">{{texto_dot}}</button>',
    "  </main>",
    "</body>",
    "</html>"
  ].join("\n");
}
