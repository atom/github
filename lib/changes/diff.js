"use babel"

class Diff {
  constructor({gitIndex, filePath}) {
    this.gitIndex = gitIndex
    this.filePath = filePath
  }

  // Maps staged data onto a diff of the HEAD -> the working dir
  async getPatch () {
    await this.gitIndex.getStatuses()

    let all = this.gitIndex.getPatch(this.filePath, 'all')
    let staged = this.gitIndex.getPatch(this.filePath, 'staged')

    allPatch = await all
    stagedPatch = await staged

    let allHunks = await this._extractHunks(allPatch)
    let stagedHunks = await this._extractHunks(stagedPatch)

    // This is not really correct. Problematic when there are staged changes,
    // then another change is made in the area of the staged change.
    for(let hunk of allHunks) {
      for(let line of hunk.lines) {
        if(this._lineInHunks(line, stagedHunks)){
          console.log('STAGED', line.oldLineno(), line.newLineno(), line.content().split(/[\r\n]/g)[0])
          line.staged = true
        }
      }
    }

    return {
      entry: {
        path: this.filePath,
        status: 'all'
      },
      patch: new Patch(allPatch, allHunks)
    }
  }

  _lineInHunks(lineToFind, hunks) {
    for(let hunk of hunks) {
      for(let line of hunk.lines) {
        if(this._linesEqual(line, lineToFind))
          return true
      }
    }
  }

  _linesEqual(lineA, lineB) {
    let contentA = lineA.content().split(/[\r\n]/g)[0]
    let contentB = lineB.content().split(/[\r\n]/g)[0]

    return lineA.oldLineno() == lineB.oldLineno() &&
      lineA.newLineno() == lineB.newLineno() &&
      contentA == contentB
  }

  async _extractHunks(patch) {
    let hunks = []
    if (patch) {
      for (let hunk of (await patch.hunks())) {
        let lines = await hunk.lines()
        hunks.push(new Hunk(hunk, lines))
      }
    }
    return hunks
  }
}

class Patch {
  constructor(patch, hunks) {
    this._patch = patch
    this.newPathName = patch.newFile().path()
    this.oldPathName = patch.oldFile().path()
    this.hunks = hunks
    for(let hunk of hunks) {
      hunk.patch = this
    }
  }

  getRaw() {
    return this._patch
  }

  size() {
    return this._patch.size()
  }

  isRenamed() {
    return this._patch.isRenamed()
  }

  isAdded() {
    return this._patch.isAdded()
  }

  isUntracked() {
    return this._patch.isUntracked()
  }

  isDeleted() {
    return this._patch.isDeleted()
  }
}

class Hunk {
  constructor(hunk, lines) {
    this._hunk = hunk
    this.header = hunk.header()
    this.lines = lines
  }
}

module.exports = Diff
