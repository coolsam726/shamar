import type { HttpContext } from '@adonisjs/core/http';

export interface ShamarHttpContext extends HttpContext {
  view: {
    render(template: string, data?: Record<string, unknown>): Promise<unknown>;
  };
  session: {
    flash(key: string, value: unknown): void;
    get?(key: string): unknown;
    put?(key: string, value: unknown): void;
    forget?(key: string): void;
    flashMessages?: {
      has(key: string): boolean;
      get(key: string): unknown;
    };
  };
}

export type AuthCapableContext = ShamarHttpContext & {
  auth?: {
    use(guard: string): {
      check(): Promise<boolean>;
      user?: Record<string, unknown>;
    };
  };
};
