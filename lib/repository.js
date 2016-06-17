/** @babel */

import StagingArea from './staging-area'

export default class Repository {
  constructor (rawRepository, workingDirectory) {
    this.rawRepository = rawRepository
    this.workingDirectory = workingDirectory
    this.stagingArea = new StagingArea(rawRepository)
  }

  getWorkingDirectory () {
    return this.workingDirectory
  }

  getStagingArea () {
    return this.stagingArea
  }
}
