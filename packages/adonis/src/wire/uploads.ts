import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface StoredWireUpload {
  id: string;
  name: string;
  size: number;
}

/** Persist one browser upload so a Wire component can keep the id in public state. */
export async function storeWireUpload(
  directory: string,
  file: { name: string; contents: Buffer },
): Promise<StoredWireUpload> {
  const id = randomUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'upload';
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, `${id}-${safeName}`), file.contents);
  return { id, name: safeName, size: file.contents.byteLength };
}
