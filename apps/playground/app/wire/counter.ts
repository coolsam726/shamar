import { Wire } from '@shamar/adonis'

export default class Counter extends Wire {
  count = 0

  increment() {
    this.count++
  }
}
