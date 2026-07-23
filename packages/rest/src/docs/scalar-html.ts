export interface ScalarDocsHtmlOptions {
  /** Absolute or relative URL to the OpenAPI JSON document. */
  openApiUrl: string;
  title?: string;
}

/**
 * Minimal Scalar API Reference page (CDN). No Edge dependency.
 */
export function renderScalarHtml(options: ScalarDocsHtmlOptions): string {
  const title = escapeHtml(options.title ?? 'API Docs');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    html, body { margin: 0; height: 100%; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  <script>
    Scalar.createApiReference('#app', {
      url: ${JSON.stringify(options.openApiUrl)},
      theme: 'default',
      layout: 'modern',
      hideModels: false,
    });
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
