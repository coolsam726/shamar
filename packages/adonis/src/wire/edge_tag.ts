type CompileParser = {
  utils: {
    generateAST: (source: string, loc: unknown, filename: string) => unknown;
    transformAst: (ast: unknown, filename: string, parser: unknown) => unknown;
    stringify: (ast: unknown) => string;
  };
  processToken: (token: unknown, buffer: unknown) => void;
};

type CompileBuffer = {
  outputExpression: (source: string, filename: string, line: number, escape: boolean) => void;
  outputRaw: (html: string) => void;
};

type EdgeLike = {
  registerTag(tag: {
    tagName: string;
    block: boolean;
    seekable: boolean;
    compile: (parser: CompileParser, buffer: CompileBuffer, token: WireTagToken) => void;
  }): void;
  processor?: {
    process(event: 'raw', handler: (data: { raw: string; path: string }) => string): unknown;
  };
};

type WireTagToken = {
  properties: { jsArg: string };
  filename: string;
  loc: { start: { line: number } };
  children?: unknown[];
};

const OPEN_TAG = /<wire:([A-Za-z_][\w.-]*)([^>]*)>/g;

/**
 * Turn `<wire:counter />` and `<wire:posts.form :count="4" />` into `@wire(...)`.
 * Plain attributes are strings. `:count` is a JavaScript expression. `{{ }}` in an
 * attribute is unwrapped to that expression. The `@wire` tag stays valid on its own.
 */
export function rewriteWireTags(source: string): string {
  let out = '';
  let cursor = 0;
  OPEN_TAG.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = OPEN_TAG.exec(source))) {
    const name = match[1];
    const rawAttrs = match[2] ?? '';
    const selfClosing = /\/\s*$/.test(rawAttrs);
    const attrs = selfClosing ? rawAttrs.replace(/\/\s*$/, '') : rawAttrs;
    out += source.slice(cursor, match.index);
    if (selfClosing) {
      out += emitWire(name, attrs);
      cursor = OPEN_TAG.lastIndex;
      continue;
    }
    const closeAt = indexOfClosingTag(source, OPEN_TAG.lastIndex, name);
    if (closeAt === -1) {
      out += match[0];
      cursor = OPEN_TAG.lastIndex;
      continue;
    }
    const inner = source.slice(OPEN_TAG.lastIndex, closeAt);
    if (inner.trim() !== '') {
      out += match[0];
      cursor = OPEN_TAG.lastIndex;
      continue;
    }
    out += emitWire(name, attrs);
    cursor = closeAt + `</wire:${name}>`.length;
    OPEN_TAG.lastIndex = cursor;
  }
  out += source.slice(cursor);
  return out;
}

function emitWire(name: string, rawAttrs: string): string {
  const props = parseWireAttributes(rawAttrs);
  if (props.length === 0) return `@wire('${name}')`;
  return `@wire('${name}', { ${props.join(', ')} })`;
}

function parseWireAttributes(raw: string): string[] {
  const props: string[] = [];
  const input = raw.trim();
  let index = 0;
  while (index < input.length) {
    while (index < input.length && /\s/.test(input[index] ?? '')) index += 1;
    if (index >= input.length) break;
    let dynamic = false;
    if (input[index] === ':') {
      dynamic = true;
      index += 1;
    }
    const name = /^[A-Za-z_][\w.-]*/.exec(input.slice(index));
    if (!name) break;
    index += name[0].length;
    while (index < input.length && /\s/.test(input[index] ?? '')) index += 1;
    if (input[index] !== '=') {
      props.push(`${jsKey(name[0])}: true`);
      continue;
    }
    index += 1;
    while (index < input.length && /\s/.test(input[index] ?? '')) index += 1;
    const quoted = readAttributeValue(input, index);
    index = quoted.next;
    const value = dynamic ? quoted.value : edgeExpression(quoted.value);
    props.push(`${jsKey(name[0])}: ${value}`);
  }
  return props;
}

function readAttributeValue(input: string, index: number): { value: string; next: number } {
  const quote = input[index];
  if (quote === '"' || quote === "'") {
    let value = '';
    index += 1;
    while (index < input.length && input[index] !== quote) {
      if (input[index] === '\\' && index + 1 < input.length) {
        value += input[index + 1];
        index += 2;
        continue;
      }
      value += input[index];
      index += 1;
    }
    return { value, next: index + 1 };
  }
  const bare = /^[^\s>]+/.exec(input.slice(index));
  const value = bare?.[0] ?? '';
  return { value, next: index + value.length };
}

function edgeExpression(value: string): string {
  const triple = /^\{\{\{\s*([\s\S]+?)\s*\}\}\}$/.exec(value);
  if (triple?.[1]) return triple[1];
  const doubled = /^\{\{\s*([\s\S]+?)\s*\}\}$/.exec(value);
  if (doubled?.[1]) return doubled[1];
  return JSON.stringify(value);
}

function jsKey(name: string): string {
  return /^[A-Za-z_][\w]*$/.test(name) ? name : JSON.stringify(name);
}

function indexOfClosingTag(source: string, from: number, name: string): number {
  const close = `</wire:${name}>`;
  return source.indexOf(close, from);
}

/** `@wire('counter')`, `<wire:counter />`, and `@persist('sidebar')`. */
export function registerWireTag(edge: EdgeLike): void {
  edge.processor?.process('raw', ({ raw }) => rewriteWireTags(raw));
  edge.registerTag({
    tagName: 'wire',
    block: false,
    seekable: true,
    compile(parser, buffer, token) {
      const ast = parser.utils.generateAST(`[${token.properties.jsArg}]`, token.loc, token.filename);
      const transformed = parser.utils.transformAst(ast, token.filename, parser);
      buffer.outputExpression(
        `state.wire(...${parser.utils.stringify(transformed)})`,
        token.filename,
        token.loc.start.line,
        false,
      );
    },
  });
  edge.registerTag({
    tagName: 'persist',
    block: true,
    seekable: true,
    compile(parser, buffer, token) {
      const ast = parser.utils.generateAST(token.properties.jsArg, token.loc, token.filename);
      const transformed = parser.utils.transformAst(ast, token.filename, parser);
      buffer.outputRaw('<div wire:persist="');
      buffer.outputExpression(
        `String(${parser.utils.stringify(transformed)}).replace(/"/g, '&quot;')`,
        token.filename,
        token.loc.start.line,
        false,
      );
      buffer.outputRaw('">');
      for (const child of token.children ?? []) parser.processToken(child, buffer);
      buffer.outputRaw('</div>');
    },
  });
}
