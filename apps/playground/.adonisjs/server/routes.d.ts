import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'shamar.admin.assets.adminCss': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.brandingCss': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.shamarUi': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.legacyUi': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.alpineJs': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.flowbiteDatepickerCss': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.flowbiteDatepickerJs': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.apexCharts': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.chartJs': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.richEditor': { paramsTuple: [ParamValue]; params: {'file': ParamValue} }
    'shamar.admin.media.index': { paramsTuple?: []; params?: {} }
    'shamar.admin.media.browse': { paramsTuple?: []; params?: {} }
    'shamar.admin.media.folders.index': { paramsTuple?: []; params?: {} }
    'shamar.admin.media.folders.create': { paramsTuple?: []; params?: {} }
    'shamar.admin.media.folders.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.folders.move': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.folders.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.upload': { paramsTuple?: []; params?: {} }
    'shamar.admin.media.files.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.files.raw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.files.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.files.move': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.files.visibility': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.files.copy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.files.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.pages.sectionFormState': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'section': ParamValue} }
    'shamar.admin.pages.sectionSave': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'section': ParamValue} }
    'shamar.admin.dashboard': { paramsTuple?: []; params?: {} }
    'shamar.admin.pages.action': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'action': ParamValue} }
    'shamar.admin.resources.create': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.formState': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.relationSearch': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.relationTable': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.relationQuickCreate': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.relationAttach': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.relationDetach': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.store': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.bulk': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.summary': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.recordAction': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue,'action': ParamValue} }
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
    'shamar.app.assets.flowbiteDatepickerCss': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.flowbiteDatepickerJs': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.apexCharts': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.chartJs': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.richEditor': { paramsTuple: [ParamValue]; params: {'file': ParamValue} }
    'shamar.app.media.index': { paramsTuple?: []; params?: {} }
    'shamar.app.media.browse': { paramsTuple?: []; params?: {} }
    'shamar.app.media.folders.index': { paramsTuple?: []; params?: {} }
    'shamar.app.media.folders.create': { paramsTuple?: []; params?: {} }
    'shamar.app.media.folders.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.folders.move': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.folders.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.upload': { paramsTuple?: []; params?: {} }
    'shamar.app.media.files.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.files.raw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.files.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.files.move': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.files.visibility': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.files.copy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.files.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.pages.sectionFormState': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'section': ParamValue} }
    'shamar.app.pages.sectionSave': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'section': ParamValue} }
    'shamar.app.dashboard': { paramsTuple?: []; params?: {} }
    'shamar.app.pages.action': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'action': ParamValue} }
    'shamar.app.resources.create': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.formState': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.relationSearch': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.relationTable': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.relationQuickCreate': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.relationAttach': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.relationDetach': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.store': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.bulk': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.summary': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.recordAction': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue,'action': ParamValue} }
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
    'shamar.media.public': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.rest.openapi': { paramsTuple?: []; params?: {} }
    'shamar.rest.docs': { paramsTuple?: []; params?: {} }
    'demo_sandbox.status': { paramsTuple?: []; params?: {} }
    'demo_sandbox.status_options': { paramsTuple?: []; params?: {} }
    'demo_sandbox.reset': { paramsTuple?: []; params?: {} }
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
    'shamar.admin.assets.flowbiteDatepickerCss': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.flowbiteDatepickerJs': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.apexCharts': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.chartJs': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.richEditor': { paramsTuple: [ParamValue]; params: {'file': ParamValue} }
    'shamar.admin.media.index': { paramsTuple?: []; params?: {} }
    'shamar.admin.media.browse': { paramsTuple?: []; params?: {} }
    'shamar.admin.media.folders.index': { paramsTuple?: []; params?: {} }
    'shamar.admin.media.files.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.files.raw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.dashboard': { paramsTuple?: []; params?: {} }
    'shamar.admin.resources.create': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.relationSearch': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.relationTable': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.summary': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.assets.adminCss': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.brandingCss': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.shamarUi': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.legacyUi': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.alpineJs': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.flowbiteDatepickerCss': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.flowbiteDatepickerJs': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.apexCharts': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.chartJs': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.richEditor': { paramsTuple: [ParamValue]; params: {'file': ParamValue} }
    'shamar.app.media.index': { paramsTuple?: []; params?: {} }
    'shamar.app.media.browse': { paramsTuple?: []; params?: {} }
    'shamar.app.media.folders.index': { paramsTuple?: []; params?: {} }
    'shamar.app.media.files.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.files.raw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.dashboard': { paramsTuple?: []; params?: {} }
    'shamar.app.resources.create': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.relationSearch': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.relationTable': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.summary': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.api.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.api.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.media.public': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.rest.openapi': { paramsTuple?: []; params?: {} }
    'shamar.rest.docs': { paramsTuple?: []; params?: {} }
    'demo_sandbox.status': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'shamar.admin.assets.adminCss': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.brandingCss': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.shamarUi': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.legacyUi': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.alpineJs': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.flowbiteDatepickerCss': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.flowbiteDatepickerJs': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.apexCharts': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.chartJs': { paramsTuple?: []; params?: {} }
    'shamar.admin.assets.richEditor': { paramsTuple: [ParamValue]; params: {'file': ParamValue} }
    'shamar.admin.media.index': { paramsTuple?: []; params?: {} }
    'shamar.admin.media.browse': { paramsTuple?: []; params?: {} }
    'shamar.admin.media.folders.index': { paramsTuple?: []; params?: {} }
    'shamar.admin.media.files.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.files.raw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.dashboard': { paramsTuple?: []; params?: {} }
    'shamar.admin.resources.create': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.relationSearch': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.relationTable': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.summary': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.assets.adminCss': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.brandingCss': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.shamarUi': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.legacyUi': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.alpineJs': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.flowbiteDatepickerCss': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.flowbiteDatepickerJs': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.apexCharts': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.chartJs': { paramsTuple?: []; params?: {} }
    'shamar.app.assets.richEditor': { paramsTuple: [ParamValue]; params: {'file': ParamValue} }
    'shamar.app.media.index': { paramsTuple?: []; params?: {} }
    'shamar.app.media.browse': { paramsTuple?: []; params?: {} }
    'shamar.app.media.folders.index': { paramsTuple?: []; params?: {} }
    'shamar.app.media.files.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.files.raw': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.dashboard': { paramsTuple?: []; params?: {} }
    'shamar.app.resources.create': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.relationSearch': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.relationTable': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.edit': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.summary': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.api.index': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.api.show': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.media.public': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.rest.openapi': { paramsTuple?: []; params?: {} }
    'shamar.rest.docs': { paramsTuple?: []; params?: {} }
    'demo_sandbox.status': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'shamar.admin.media.folders.create': { paramsTuple?: []; params?: {} }
    'shamar.admin.media.folders.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.folders.move': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.folders.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.upload': { paramsTuple?: []; params?: {} }
    'shamar.admin.media.files.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.files.move': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.files.visibility': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.files.copy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.media.files.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.admin.pages.sectionFormState': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'section': ParamValue} }
    'shamar.admin.pages.sectionSave': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'section': ParamValue} }
    'shamar.admin.pages.action': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'action': ParamValue} }
    'shamar.admin.resources.formState': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.relationQuickCreate': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.relationAttach': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.relationDetach': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.store': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.bulk': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.admin.resources.recordAction': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue,'action': ParamValue} }
    'shamar.admin.resources.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.admin.resources.update': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.media.folders.create': { paramsTuple?: []; params?: {} }
    'shamar.app.media.folders.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.folders.move': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.folders.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.upload': { paramsTuple?: []; params?: {} }
    'shamar.app.media.files.rename': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.files.move': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.files.visibility': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.files.copy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.media.files.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'shamar.app.pages.sectionFormState': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'section': ParamValue} }
    'shamar.app.pages.sectionSave': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'section': ParamValue} }
    'shamar.app.pages.action': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'action': ParamValue} }
    'shamar.app.resources.formState': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.relationQuickCreate': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.relationAttach': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.relationDetach': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.store': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.bulk': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'shamar.app.resources.recordAction': { paramsTuple: [ParamValue,ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue,'action': ParamValue} }
    'shamar.app.resources.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.app.resources.update': { paramsTuple: [ParamValue,ParamValue]; params: {'slug': ParamValue,'id': ParamValue} }
    'shamar.api.store': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'demo_sandbox.reset': { paramsTuple?: []; params?: {} }
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
  OPTIONS: {
    'demo_sandbox.status_options': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}