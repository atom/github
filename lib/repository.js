/** @babel */

import StagingArea from './staging-area'

export default class Repository {
  constructor (rawRepository) {
    this.rawRepository = rawRepository
    this.stagingArea = new StagingArea(rawRepository)
  }

  getStagingArea () {
    return this.stagingArea
  }
}
