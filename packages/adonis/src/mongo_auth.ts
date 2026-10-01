const MONGO_PROVIDER = `configProvider.create(async () => {
      const { SessionMongooseUserProvider } = await import('#auth/session_mongoose_user_provider')
      return new SessionMongooseUserProvider()
    })`;

/** Stock Lucid session auth uses `sessionUserProvider(`. Anything else is custom. */
export function sessionAuthUsesStockLucidProvider(source: string): boolean {
  return source.includes('sessionUserProvider(');
}

/**
 * Replace Adonis's default Lucid session user provider with a Mongoose lookup.
 * Returns the original file when that default call is not present.
 */
export function patchSessionAuthForMongoose(source: string): { contents: string; patched: boolean } {
  if (!sessionAuthUsesStockLucidProvider(source)) {
    return { contents: source, patched: false };
  }

  let contents = source.replace(/sessionUserProvider\(\s*\{[\s\S]*?\}\s*\)/, MONGO_PROVIDER);
  contents = contents.replace(
    /import\s*\{([^}]+)\}\s*from\s*'@adonisjs\/auth\/session'/,
    (_match, names: string) => {
      const kept = names
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name && name !== 'sessionUserProvider');
      if (kept.length === 0) return '';
      return `import { ${kept.join(', ')} } from '@adonisjs/auth/session'`;
    },
  );

  if (!/import\s*\{[^}]*\bconfigProvider\b[^}]*\}\s*from\s*'@adonisjs\/core'/.test(contents)) {
    contents = `import { configProvider } from '@adonisjs/core'\n${contents}`;
  }

  return { contents, patched: contents !== source };
}
