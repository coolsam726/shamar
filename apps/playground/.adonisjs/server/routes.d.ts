import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'shamar.admin.assets.adminCss': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.brandingCss': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.shamarUi': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.legacyUi': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.alpineJs': { paramsTuple?: []; params?: {} }
    'shamar.admin.dashboard': { paramsTuple?: []; params?: {} }
    'shamar.admin.resources.create': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.formState': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.store': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.update': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.update.put': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.destroy.delete': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.assets.adminCss': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.brandingCss': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.shamarUi': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.legacyUi': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.alpineJs': { paramsTuple?: []; params?: {} }
    'shamar.app.dashboard': { paramsTuple?: []; params?: {} }
    'shamar.app.resources.create': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.formState': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.store': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.update': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.update.put': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.destroy.delete': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.api.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.api.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.api.store': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.api.update': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.api.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'shamar.admin.assets.adminCss': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.brandingCss': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.shamarUi': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.legacyUi': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.alpineJs': { paramsTuple?: []; params?: {} }
    'shamar.admin.dashboard': { paramsTuple?: []; params?: {} }
    'shamar.admin.resources.create': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.assets.adminCss': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.brandingCss': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.shamarUi': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.legacyUi': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.alpineJs': { paramsTuple?: []; params?: {} }
    'shamar.app.dashboard': { paramsTuple?: []; params?: {} }
    'shamar.app.resources.create': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.api.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.api.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'shamar.admin.assets.adminCss': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.brandingCss': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.shamarUi': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.legacyUi': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.alpineJs': { paramsTuple?: []; params?: {} }
    'shamar.admin.dashboard': { paramsTuple?: []; params?: {} }
    'shamar.admin.resources.create': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.assets.adminCss': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.brandingCss': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.shamarUi': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.legacyUi': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.alpineJs': { paramsTuple?: []; params?: {} }
    'shamar.app.dashboard': { paramsTuple?: []; params?: {} }
    'shamar.app.resources.create': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.api.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.api.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'home': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'shamar.admin.resources.formState': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.store': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.update': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.formState': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.store': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.update': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.api.store': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'shamar.admin.resources.update.put': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.update.put': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.api.update': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
  }
  DELETE: {
    'shamar.admin.resources.destroy.delete': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.destroy.delete': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.api.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}