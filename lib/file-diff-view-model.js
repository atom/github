/* @flow */

import type FileDiff from './file-diff'
import type {StageStatus} from './diff-hunk'
import type {ChangeStatus} from './file-diff'

export default class FileDiffViewModel {
  fileDiff: FileDiff;

  constructor (fileDiff: FileDiff) {
    this.fileDiff = fileDiff
  }

  getFileDiff (): FileDiff { return this.fileDiff }

  getTitle (): string {
    let title = this.fileDiff.getNewPathName()
    if (this.fileDiff.isRenamed()) {
      // $FlowSilence: If it's a rename then we know it has an old path.
      title = this.fileDiff.getOldPathName() + ' → ' + title
    }

    // $FlowSilence: We'll be non-null by now.
    return title
  }

  getStageStatus (): StageStatus {
    return this.fileDiff.getStageStatus()
  }

  getChangeStatus (): ChangeStatus {
    return this.fileDiff.getChangeStatus()
  }

  openDiff (options: {pending: boolean}): Promise<void> {
    return this.fileDiff.openDiff(options)
  }
}
