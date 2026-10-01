export function parseWireName(input: string): { file: string; className: string; tag: string } {
  const file = input
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\.ts$/, '');
  if (!file || file.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Invalid Wire component name: ${input}`);
  }
  const segments = file.split('/');
  const className = segments[segments.length - 1]!
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
  const tag = segments
    .map((part) =>
      part
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/_/g, '-')
        .toLowerCase(),
    )
    .join('.');
  return { file, className, tag };
}
