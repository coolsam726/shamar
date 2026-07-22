import type {
  AbilityHandler,
  AuthorizationContext,
  AuthorizationTarget,
} from './types.js';

export class AbilityRegistry {
  private readonly handlers = new Map<string, AbilityHandler>();
  private readonly beforeHandlers: AbilityHandler[] = [];

  /** Register a handler for an exact ability string. */
  define(ability: string, handler: AbilityHandler): this {
    this.handlers.set(ability, handler);
    return this;
  }

  /** Handlers run before ability-specific checks (return false to deny). */
  before(handler: AbilityHandler): this {
    this.beforeHandlers.push(handler);
    return this;
  }

  async check(
    ctx: AuthorizationContext,
    ability: string,
    target?: AuthorizationTarget,
  ): Promise<boolean> {
    for (const handler of this.beforeHandlers) {
      const result = await handler(ctx, target);
      if (result === false) return false;
    }

    const handler = this.handlers.get(ability);
    if (!handler) return false;

    const result = await handler(ctx, target);
    return result === true;
  }
}
