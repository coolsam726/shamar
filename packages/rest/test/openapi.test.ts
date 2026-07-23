import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import vine from '@vinejs/vine';
import {
  Resource,
  ResourceRegistry,
  form,
  table,
  TextInput,
  TextColumn,
  Checkbox,
} from '@shamar/core';
import {
  buildOpenApiDocument,
  defineRestConfig,
  dto,
  optional,
  string,
  number,
  array,
  nullable,
  resolveSchema,
  vineToOpenApiSchema,
  buildPathsFromDiscoveredRoutes,
} from '../src/index.js';

class DemoResource extends Resource {
  static override slug = 'posts';
  static override label = 'Posts';
  static override singularLabel = 'Post';
  static override model = 'Post';

  static override form() {
    return form((f) => {
      f.schema([
        TextInput.make('title').required(),
        TextInput.make('body').required(),
        Checkbox.make('published'),
        TextInput.make('secret').password(),
      ]);
    });
  }

  static override table() {
    return table((t) => {
      t.schema([TextColumn.make('title')]);
    });
  }
}

describe('@shamar/rest OpenAPI', () => {
  it('builds absolute CRUD paths and schemas from resources', () => {
    const registry = new ResourceRegistry([DemoResource]);

    const doc = buildOpenApiDocument({
      apiPrefix: '/api/shamar',
      registry,
      title: 'Demo API',
      version: '0.1.0',
      discover: false,
    });

    assert.equal(doc.openapi, '3.1.0');
    assert.equal(doc.info.title, 'Demo API');
    assert.ok(doc.paths['/api/shamar/posts']?.get);
    assert.ok(doc.paths['/api/shamar/posts']?.post);
    assert.ok(doc.paths['/api/shamar/posts/{id}']?.get);
    assert.ok(doc.paths['/api/shamar/posts/{id}']?.put);
    assert.ok(doc.paths['/api/shamar/posts/{id}']?.delete);
    assert.ok(doc.components?.schemas?.PostsRecord);
    assert.ok(doc.components?.schemas?.PostsCreate);
    assert.deepEqual(doc.components?.schemas?.PostsCreate?.required, ['title', 'body']);
    assert.equal(doc.components?.schemas?.PostsCreate?.properties?.secret?.writeOnly, true);
    assert.ok(doc.components?.securitySchemes?.ApiKeyAuth);
  });

  it('defineRestConfig applies defaults including discover', () => {
    const config = defineRestConfig({});
    assert.equal(config.enabled, true);
    assert.equal(config.docs?.path, '/docs');
    assert.equal(config.openapiPath, '/openapi.json');
    assert.deepEqual((config.discover as { prefixes: string[] }).prefixes, ['/api']);
  });
});

describe('@shamar/rest DTO + Vine', () => {
  it('builds response DTOs', () => {
    const UserDto = dto({
      id: string(),
      email: string({ format: 'email' }),
      age: optional(number()),
      nickname: optional(nullable(string())),
    });

    const schema = UserDto.toOpenApi();
    assert.equal(schema.type, 'object');
    assert.deepEqual(schema.required, ['id', 'email']);
    assert.equal(schema.properties?.email?.format, 'email');
    assert.ok(schema.properties?.nickname?.type);
  });

  it('converts Vine validators to OpenAPI schemas', () => {
    const validator = vine.create({
      name: vine.string(),
      email: vine.string().email(),
      age: vine.number().optional(),
    });

    const schema = vineToOpenApiSchema(validator);
    assert.equal(schema.type, 'object');
    assert.equal(schema.properties?.email?.format, 'email');
    assert.deepEqual(schema.required, ['name', 'email']);
  });

  it('resolveSchema accepts Vine, DTO, and raw schemas', () => {
    const validator = vine.create({ q: vine.string() });
    assert.equal(resolveSchema(validator).properties?.q?.type, 'string');
    assert.equal(resolveSchema(dto({ ok: string() })).properties?.ok?.type, 'string');
    assert.equal(resolveSchema({ type: 'boolean' }).type, 'boolean');
  });
});

describe('@shamar/rest discovered routes', () => {
  it('builds operations from route metadata', () => {
    const CreateUser = vine.create({
      email: vine.string().email(),
      name: vine.string(),
    });
    const UserDto = dto({
      id: string(),
      email: string({ format: 'email' }),
      name: string(),
    });

    const paths = buildPathsFromDiscoveredRoutes([
      {
        pattern: '/api/users',
        methods: ['get'],
        name: 'api.users.index',
        meta: {
          tags: ['Users'],
          summary: 'List users',
          query: vine.create({ page: vine.number().optional() }),
          response: array(UserDto),
        },
      },
      {
        pattern: '/api/users',
        methods: ['post'],
        name: 'api.users.store',
        meta: {
          tags: ['Users'],
          body: CreateUser,
          response: UserDto,
          responseStatus: 201,
        },
      },
      {
        pattern: '/api/users/:id',
        methods: ['get'],
        meta: {
          tags: ['Users'],
          response: UserDto,
        },
      },
    ]);

    assert.ok(paths['/api/users']?.get);
    assert.equal(paths['/api/users']?.get?.tags?.[0], 'Users');
    assert.ok(paths['/api/users']?.get?.parameters?.some((p) => p.name === 'page'));
    assert.ok(paths['/api/users']?.post?.requestBody);
    assert.ok(paths['/api/users/{id}']?.get);
    assert.ok(
      paths['/api/users/{id}']?.get?.parameters?.some((p) => p.in === 'path' && p.name === 'id'),
    );
  });
});
