import type { WireRequest } from '@shamar/wire';
import type { AuthorizationContext } from '@shamar/cherubim';
import type { Authorizer } from '@shamar/cherubim';
import type { PanelRuntime } from '../runtime.js';
import type { NotificationSession } from './notifications.js';
import { updateGlobalSearch } from './global-search.js';
import { updateNotifications } from './notifications.js';
import { updateRelationManager } from './relation-manager.js';

/**
 * One panel endpoint serves every island. The snapshot name picks the component.
 * Unknown names fail closed instead of running global search by accident.
 */
export function handleWireRequest(input: {
  panel: PanelRuntime;
  authorizer: Authorizer;
  authCtx: AuthorizationContext;
  session: NotificationSession;
  request: WireRequest;
}) {
  const name = input.request?.snapshot?.name;
  const basePath = input.panel.path;
  if (name === 'notifications') {
    return updateNotifications(basePath, input.session, input.request);
  }
  if (name === 'global-search') {
    return updateGlobalSearch(input.panel, input.authorizer, input.authCtx, input.request);
  }
  if (name === 'relation-manager') {
    const parentSlug = String(input.request.snapshot?.data?.parentSlug ?? '');
    const parent = input.panel.registry.get(parentSlug);
    if (!parent) throw new Error('Unknown wire component: relation-manager');
    return updateRelationManager(
      basePath,
      input.panel.adapter,
      parent,
      input.panel.registry,
      input.request,
    );
  }
  throw new Error(`Unknown wire component: ${name || '(missing)'}`);
}
