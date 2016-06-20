/** @babel */

import FakeStagingArea from './fake-staging-area'

export default class FakeRepository {
  constructor () {
    this.stagingArea = new FakeStagingArea()
  }

  getStagingArea () {
    return this.stagingArea
  }
}
