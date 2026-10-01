# @shamar/wire

Server-driven reactive components for Shamar admin panels. This is the runtime those panels are built on: the same role [Livewire](https://livewire.laravel.com/) plays for Filament, and Conduit plays for Almasix Orbit.

`@shamar/wire` is the kernel and the browser script (`client/wire.js`, `wireClientPath()`). On Adonis, `@shamar/adonis` discovers `app/wire`, serves `GET /wire.js` and `POST /wire`, and renders `@wire('counter')`. `node ace make:wire counter` creates the class and the Edge view. A Shamar admin panel is one host. Any other Node server calls `mount` and `update` itself. The docs section **Wire** walks through both.

Existing Alpine UI stays. A piece of the panel moves onto Wire when its markup opts in with `wire:*`. `live()` form fields still use `POST {panel}/{slug}/form-state`.

## Install

`pnpm add @shamar/adonis` installs the panel and `@shamar/wire`. The host re-exports `WireKernel`, `WireComponent`, and `WireRequest`. Install the kernel on its own only when you are not using the Adonis host:

```bash
pnpm add @shamar/wire
```

No peer dependencies. Node 20+.

New versions are published by GitHub Actions, not from a laptop token. npm trusted publishing for `@shamar/wire` accepts publishes from the `publish.yml` workflow in `coolsam726/shamar`. A GitHub release of the monorepo runs it.

## What a request does

1. **Mount.** The server creates the component, copies `data` into a signed snapshot, and returns one HTML island.
2. **Commit.** The browser posts that snapshot plus property updates and method calls to the island’s `wire:endpoint`.
3. **Verify.** The server rejects the body unless the snapshot checksum matches. Public state is whatever is on `data` after `create()`; keys the client invents are ignored.
4. **Run.** Property hooks run, then method calls, in that order.
5. **Render.** The server signs a new snapshot with the same island id and returns HTML. The browser morphs the current island so focus, cursor, and nested Alpine trees survive.

```json
{
  "snapshot": { "id": "…", "name": "counter", "data": { "count": 0 }, "checksum": "…" },
  "updates": { "count": 1 },
  "calls": [{ "method": "increment", "params": [] }]
}
```

The response is the same shape the kernel returns from `mount` and `update`:

```json
{
  "snapshot": { "id": "…", "name": "counter", "data": { "count": 2 }, "checksum": "…" },
  "html": "<div wire:id=\"…\" wire:snapshot=\"…\" wire:endpoint=\"/admin/wire\">…</div>",
  "effects": { "redirect": "/admin/orders/1" }
}
```

`effects` is present only when the component set one. A redirect is not stored in the snapshot.

## Write a component

A component is a small object with public `data` and optional methods. Register it by name on a `WireKernel`.

```ts
import { WireKernel, type WireComponent } from '@shamar/wire'

class Counter implements WireComponent {
  data = { count: 0 }

  increment(): void {
    this.data.count = Number(this.data.count) + 1
  }

  updatedCount(): void {
    if (Number(this.data.count) < 0) this.data.count = 0
  }
}

const kernel = new WireKernel(process.env.APP_KEY!, {
  counter: {
    create: () => new Counter(),
    render: (component) => `<button wire:click="increment">${component.data.count}</button>`,
  },
})

const island = kernel.mount('counter', '/admin/wire')
// island.html is the first render
// island.snapshot is what the browser must post back
```

`create()` runs on every update. The kernel then copies snapshot `data` onto the new instance, applying only keys that already exist. Do not keep request-only state on the class and expect it to survive the next POST. Put it on `data`, or recompute it inside `updated` / the action method.

### Property hooks

After a public property changes, the kernel calls, in order:

| Hook | When |
|------|------|
| `updating(key, value)` | Before `data[key]` is assigned |
| `updated(key)` | After the assignment |
| `updatedTitle()` | After `title` changes. The name is `updated` + the key with its first letter uppercased |

Hooks may be async. A throw fails the request; the browser leaves the island as it was.

### Methods

`wire:click`, `wire:submit`, and `wire:keydown` become `calls`. The kernel invokes the matching function on the component with the parsed arguments.

These names are rejected: `data`, `updated`, `call`, `constructor`, `hydrate`, `dehydrate`, `render`, and any name that starts with `_`. An unknown name throws `Unknown wire method`.

### Effects

Set `this.effects` during a method. The browser navigates on `redirect` and does not morph.

```ts
save() {
  this.effects = { redirect: '/admin/orders/4' }
}
```

## HTML the kernel emits

`mount` and `update` wrap your `render()` result:

```html
<div wire:id="a1b2…" wire:snapshot="{…signed json…}" wire:endpoint="/admin/wire">
  <!-- render() -->
</div>
```

`wire:snapshot` is the full snapshot, including `checksum`, escaped for an attribute. Treat it as opaque. Rendering user content inside the island is your job: use `escapeHtml` / `escapeAttr` from this package.

## Browser runtime

`@shamar/adonis` serves `assets/wire.js` at `{panel}/assets/wire.js` and loads it from the admin shell. The script listens on `document`, so every island on the page shares one runtime.

It coexists with Alpine. On `alpine:init` it registers the `$wire` magic. After a morph it calls `Alpine.initTree` on nodes that were inserted.

### Bindings

| Attribute | Behavior |
|-----------|----------|
| `wire:model="title"` | Queue the value. It is sent with the next action (`wire:click`, `wire:submit`, …). |
| `wire:model.live="title"` | POST on `input`. |
| `wire:model.blur="title"` | POST on `blur`. |
| `wire:model.debounce.250ms="query"` | POST after 250ms of quiet. |
| `wire:click="save"` | POST a call to `save`. |
| `wire:click="remove('draft')"` | Call with parsed arguments. Quoted strings, numbers, `true`, `false`, and `null` are typed; anything else is a string. |
| `wire:submit="save"` | On the `<form>`. Prevents the browser submit and calls `save`. |
| `wire:keydown.enter="save"` | Call when Enter is pressed inside the element. |
| `wire:keydown="onKey"` | Call for any key on that element. |
| `wire:loading` | Hidden until a request for this island is in flight. |
| `wire:loading.remove` | Visible until a request is in flight, then hidden. |
| `wire:ignore` | Morph leaves this element and its descendants alone. |
| `wire:key="{{ id }}"` | Stable identity for a child so morph reuses the DOM node. |

A later request for the same island supersedes an in-flight one. The stale response is discarded.

### `$wire` in Alpine

Inside an island, after Alpine starts:

```html
<button type="button" x-on:click="$wire.increment()">Add</button>
<button type="button" x-on:click="$wire.$set('title', 'Draft')">Rename</button>
<span x-text="$wire.count"></span>
```

| Access | Effect |
|--------|--------|
| `$wire.count` | Read the property from the current snapshot. |
| `$wire.count = 3` | POST `{ updates: { count: 3 } }`. |
| `$wire.increment(1)` | POST a call. |
| `$wire.$set('count', 3)` | Same as a property write. |
| `$wire.$call('increment', 1)` | Same as a method call. |

## Signing

Snapshots are HMAC-SHA256 over `id`, `name`, and a canonical JSON form of `data` (object keys sorted). `signSnapshot` and `verifySnapshot` use `timingSafeEqual`. `newComponentId()` is 8 random bytes, hex-encoded.

Pass a stable secret into `WireKernel`. The checksum covers public `data` only, so a client cannot add properties, rename the component, or change the island id without failing verification.

The panel’s global search uses a process-lifetime secret (`randomBytes` at module load). A restart invalidates islands that were already on the page; the next full navigation mounts a fresh one.

## How `@shamar/adonis` hosts it

| Piece | Where |
|-------|--------|
| `POST {panel}/wire` | `AdminController.wire`. Requires an authenticated panel session and returns JSON. |
| `GET {panel}/assets/wire.js` | Browser runtime. |
| Global search | First island. Rendered in the top bar from `mountGlobalSearch`. Updates go through `updateGlobalSearch`. |
| Re-exports | `WireKernel`, `WireComponent`, `WireRequest` from `@shamar/adonis`. |

Global search walks resources that are visible in navigation and have searchable fields, skips any the current user cannot view, and returns up to eight record links. One resource throwing does not clear the other hits.

To add another island, register a component the same way `global-search` is registered and render `kernel.mount(name, endpoint).html` into the Edge view. Point `endpoint` at the panel’s `/wire` route (or your own route that calls `kernel.update`).

## Helpers

| Export | Use |
|--------|-----|
| `WireKernel` | `mount(name, endpoint)` and `update(request, endpoint)`. |
| `escapeHtml` / `escapeAttr` | Text and attribute escaping inside `render`. |
| `signSnapshot` / `verifySnapshot` | Checksums, if you store or forward snapshots yourself. |
| `invokeMethod` | Call a public method with the same blocked-name rules as the kernel. |
| `applyUpdates` | Copy a patch onto `data` for keys that already exist. Does not run hooks; `WireKernel.update` runs hooks itself. |
| `newComponentId` | New island id. |

## Tests

```bash
pnpm --filter @shamar/wire test
```

The suite covers a signed mount, a method call, a rejected tampered snapshot, property `updated` hooks, and a redirect effect that stays out of the snapshot.
