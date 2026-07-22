import { ApiKeyResource } from '@shamar/adonis'
import ApiKey from '#models/api_key'

/** Playground binding — form/table/infolist ship from `@shamar/adonis`. */
export default class PlaygroundApiKeyResource extends ApiKeyResource {
  static override model = ApiKey
}
