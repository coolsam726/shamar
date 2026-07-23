import type { ResourceMeta, ResourceRegistry } from '@shamar/core';

/** OpenAPI 3.1 document (subset used by Shamar). */
export interface OpenApiDocument {
  openapi: '3.1.0';
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
  paths: Record<string, OpenApiPathItem>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
    securitySchemes?: Record<string, OpenApiSecurityScheme>;
    parameters?: Record<string, OpenApiParameter>;
  };
  security?: Array<Record<string, string[]>>;
}

export type OpenApiSchema = {
  type?: string | string[];
  format?: string;
  description?: string;
  enum?: Array<string | number | boolean>;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  items?: OpenApiSchema;
  additionalProperties?: boolean | OpenApiSchema;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  example?: unknown;
  oneOf?: OpenApiSchema[];
  $ref?: string;
};

export interface OpenApiParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: OpenApiSchema;
}

export interface OpenApiRequestBody {
  required?: boolean;
  description?: string;
  content: Record<string, { schema: OpenApiSchema }>;
}

export interface OpenApiResponse {
  description: string;
  content?: Record<string, { schema: OpenApiSchema }>;
}

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
  security?: Array<Record<string, string[]>>;
}

export interface OpenApiPathItem {
  get?: OpenApiOperation;
  post?: OpenApiOperation;
  put?: OpenApiOperation;
  patch?: OpenApiOperation;
  delete?: OpenApiOperation;
  parameters?: OpenApiParameter[];
}

export type OpenApiSecurityScheme =
  | {
      type: 'apiKey';
      in: 'header' | 'query' | 'cookie';
      name: string;
      description?: string;
    }
  | {
      type: 'http';
      scheme: string;
      bearerFormat?: string;
      description?: string;
    };

export interface ShamarRestDocsConfig {
  /** Serve interactive docs UI (default `true`). */
  enabled?: boolean;
  /**
   * Path under the API prefix (default `/docs`).
   * Full URL: `{apiPrefix}{path}` e.g. `/api/shamar/docs`.
   */
  path?: string;
  /** Docs UI engine (default `scalar`). */
  ui?: 'scalar';
}

export interface ShamarRestOpenApiConfig {
  title?: string;
  version?: string;
  description?: string;
  /** OpenAPI servers. Defaults to `[{ url: apiPrefix }]`. */
  servers?: Array<{ url: string; description?: string }>;
}

export interface ShamarRestDiscoverConfig {
  /** Path prefixes to scan on the Adonis router (default `['/api']`). */
  prefixes?: string[];
  /** Exact paths / prefixes to skip. */
  exclude?: string[];
}

export interface ShamarRestConfig {
  /**
   * When `false`, the provider skips registering docs/OpenAPI routes.
   * Default `true`.
   */
  enabled?: boolean;
  /**
   * Path for the OpenAPI JSON document under the API prefix
   * (default `/openapi.json`).
   */
  openapiPath?: string;
  docs?: ShamarRestDocsConfig;
  openapi?: ShamarRestOpenApiConfig;
  /**
   * Include `X-Api-Key` (and optional Bearer) security schemes.
   * Default `true`.
   */
  security?: boolean;
  /**
   * Discover custom Adonis routes under these prefixes and merge into the
   * OpenAPI document. Set `false` to disable. Default: `{ prefixes: ['/api'] }`.
   */
  discover?: ShamarRestDiscoverConfig | false;
}

export interface BuildOpenApiOptions {
  /** API path prefix (e.g. `/api/shamar`). */
  apiPrefix?: string;
  title?: string;
  version?: string;
  description?: string;
  servers?: Array<{ url: string; description?: string }>;
  /** Advertise API key / Bearer security (default `true`). */
  security?: boolean;
  /**
   * Resource filter. Default: all registered resources.
   */
  resources?: ResourceMeta[];
  registry?: ResourceRegistry;
}
