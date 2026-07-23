export { defineRestConfig, resolveRestConfig } from './config.js';
export { buildOpenApiDocument } from './openapi/document.js';
export {
  fieldToSchema,
  resourceReadSchema,
  resourceWriteSchema,
  paginatedSchema,
  schemaName,
} from './openapi/schemas.js';
export { resourcePaths } from './openapi/paths.js';
export { renderScalarHtml } from './docs/scalar-html.js';
export { registerRestRoutes } from './routes.js';
export { rest } from './rest.js';
export { installRestRouteMacros } from './macros.js';
export {
  discoverRouterRoutes,
  buildPathsFromDiscoveredRoutes,
  toOpenApiPath,
} from './discover.js';
export {
  dto,
  schema,
  string,
  number,
  integer,
  boolean,
  array,
  nullable,
  optional,
  enumOf,
  literal,
  record,
  isDtoSchema,
} from './schema/dto.js';
export { vineToOpenApiSchema } from './schema/vine.js';
export { resolveSchema } from './schema/resolve.js';
export type { SchemaInput } from './schema/resolve.js';
export type { DtoSchema, DtoField, DtoOptions } from './schema/dto.js';
export type { RouteOpenApiMeta, RouteResponseDef } from './route-meta.js';
export type {
  BuildOpenApiOptions,
  OpenApiDocument,
  OpenApiOperation,
  OpenApiParameter,
  OpenApiPathItem,
  OpenApiSchema,
  OpenApiSecurityScheme,
  ShamarRestConfig,
  ShamarRestDiscoverConfig,
  ShamarRestDocsConfig,
  ShamarRestOpenApiConfig,
} from './types.js';
