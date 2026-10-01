import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { configure } from '../src/configure.js';
import { patchSessionAuthForMongoose, sessionAuthUsesStockLucidProvider } from '../src/mongo_auth.js';

const STOCK_AUTH = `import { sessionGuard, sessionUserProvider } from '@adonisjs/auth/session'

const authConfig = defineConfig({
  guards: {
    web: sessionGuard({
      useRememberMeTokens: false,
      provider: sessionUserProvider({
        model: () => import('#models/user'),
      }),
    }),
  },
})
`;

describe('MongoDB configure', () => {
  it('replaces the stock Lucid session provider and leaves a custom one alone', () => {
    assert.equal(sessionAuthUsesStockLucidProvider(STOCK_AUTH), true);
    const patched = patchSessionAuthForMongoose(STOCK_AUTH);
    assert.equal(patched.patched, true);
    assert.match(patched.contents, /SessionMongooseUserProvider/);
    assert.match(patched.contents, /configProvider/);
    assert.equal(patched.contents.includes('sessionUserProvider'), false);

    const custom = STOCK_AUTH.replace('sessionUserProvider({', 'configProvider.create(async () => ({');
    assert.equal(sessionAuthUsesStockLucidProvider(custom), false);
    assert.equal(patchSessionAuthForMongoose(custom).patched, false);
  });

  it('registers the Mongo connection before the panel when Mongoose is chosen', async () => {
    const root = await mkdtemp(join(tmpdir(), 'shamar-mongo-configure-'));
    const providers: string[] = [];
    const envKeys: string[] = [];
    const packages: string[] = [];
    try {
      await configure({
        logger: { info() {}, success() {} },
        prompt: {
          async choice() {
            return 'mongoose';
          },
          async confirm(title) {
            if (title.includes('login page')) return false;
            return false;
          },
        },
        app: { makePath: (...segments) => join(root, ...segments) },
        async createCodemods() {
          return {
            overwriteExisting: false,
            async updateRcFile(callback) {
              callback({
                addProvider(provider) {
                  providers.push(provider);
                },
                addCommand() {},
              });
            },
            async makeUsingStub() {
              return {};
            },
            async defineEnvVariables(variables) {
              envKeys.push(...Object.keys(variables));
            },
            async defineEnvValidations(validations) {
              envKeys.push(...Object.keys(validations));
            },
            async installPackages(entries) {
              packages.push(...entries.map((entry) => entry.name));
              return true;
            },
          };
        },
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }

    assert.deepEqual(providers, ['@shamar/adonis/mongo_provider', '@shamar/adonis/provider']);
    assert.ok(envKeys.includes('MONGO_URI'));
    assert.deepEqual(packages, ['mongoose']);
  });
});
