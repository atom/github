/** @babel */
import path from 'path'
import cp from 'child_process'
import fs from 'fs'

import {parsePatch} from 'diff'

const UNMERGED_FILE_REGEX = /^\* Unmerged path.*\n/gm
const LINE_ENDING_REGEX = /\r?\n/

function resolveGit () {
  if (process.platform === 'darwin') {
    return path.join(__dirname, '../git-distributions/git-macos/git/bin/git')
  // } else if (process.platform === 'win32') {
  //   return path.join(__dirname, 'git/cmd/git.exe')
  } else {
    throw new Error('Git not supported on platform: ' + process.platform)
  }
}

export default class GitShellOutStrategy {
  constructor (workingDir) {
    this.workingDir = workingDir
  }

  // Execute a command and read the output using the embedded Git environment
  exec (args, dataToWrite = null) {
    return new Promise((resolve, reject) => {
      const formatArgs = 'executing: `git ' + args.join(' ') + '` in ' + this.workingDir
      const label = `git ${args.join(' ')} (stdin length ${dataToWrite && dataToWrite.length})@${new Date().getTime()}`
      console.time(label)

      const child = cp.execFile(resolveGit(), args, { cwd: this.workingDir, encoding: 'utf8' }, (err, output, stdErr) => {
        if (stdErr) {
          console.warn(formatArgs)
          console.warn(stdErr)
        }

        if (err) {
          console.error(formatArgs)
          console.error(err)
          return reject(err)
        }

        resolve(output)
      })

      child.on('exit', (code) => {
        if (code !== 0) console.log('process (' + formatArgs + ') exited with code:', code)
        console.timeEnd(label)
      })
      child.on('error', (err) => {
        console.error('Error executing: ' + formatArgs)
        console.error(err.stack)
      })
      child.stdin.on('error', (err) => {
        console.error('Error writing to process: ' + formatArgs)
        console.error(err.stack)
        console.error('Tried to write: ' + dataToWrite)
      })

      if (dataToWrite) {
        child.stdin.end(dataToWrite)
      }
    })
  }

  /**
   * Staging/Unstaging files and patches
   */
  stageFile (path) {
    return this.exec(['add', path])
  }

  unstageFile (path) {
    return this.exec(['reset', '--', path])
  }

  applyPatchToIndex (patch) {
    return this.exec(['apply', '--cached', '-'], patch)
  }

  /**
   * File Status and Diffs
   */
  async diffFileStatus (options = {}) {
    let args = ['diff', '--name-status']
    if (options.staged) args.push('--staged')
    if (options.target) args.push(options.target)
    if (options.diffFilter === 'unmerged') args.push('--diff-filter=U')
    const output = await this.exec(args)
    const untracked = await this.getUntrackedFiles()

    const statusMap = {
      A: 'added',
      M: 'modified',
      D: 'removed',
      U: 'unmerged'
    }

    const fileStatuses = {}
    untracked.forEach(filePath => { fileStatuses[filePath] = 'added' })
    output && output.trim().split(LINE_ENDING_REGEX).forEach(line => {
      const [status, filePath] = line.split('	')
      fileStatuses[filePath] = statusMap[status]
    })
    return fileStatuses
  }

  async getUntrackedFiles () {
    const output = await this.exec(['clean', '--dry-run'])
    if (output.trim() === '') return []
    return output.trim().split(LINE_ENDING_REGEX).map(line => line.split(' ')[2])
  }

  async diff (options = {}) {
    let args = ['diff', '--no-prefix']
    if (options.staged) args.push('--staged')
    let output = await this.exec(args)
    output = output.replace(UNMERGED_FILE_REGEX, '')

    let rawDiffs = []
    if (output) rawDiffs = parsePatch(output)

    let status
    if (!options.staged) {
      status = await this.diffFileStatus()
      // add untracked files
      const untrackedFilePatches = await Promise.all((await this.getUntrackedFiles()).map(async (filePath) => {
        const contents = await readFile(path.join(this.workingDir, filePath))
        return buildAddedFilePatch(filePath, contents)
      }))
      rawDiffs = rawDiffs.concat(untrackedFilePatches)
    } else {
      status = await this.diffFileStatus({staged: true})
    }

    // filter out merge conflict files
    // TODO: consider implementing our own version of parsePatch that does this for us and formats the patches as we like
    const statusUnmergedFiles = await this.diffFileStatus({diffFilter: 'unmerged'})
    rawDiffs = rawDiffs.filter(rawDiff => statusUnmergedFiles[rawDiff.newFileName] !== 'unmerged')

    return rawDiffs.map(patch => {
      patch = formatPatch(patch)
      let fileName = getPathForPatch(patch)
      patch.status = status[fileName]
      return patch
    }).sort((a, b) => getPathForPatch(a).localeCompare(getPathForPatch(b)))
  }

  /**
   * Reading files
   */
  readFileFromIndex (path) {
    return this.exec(['show', `:${path}`])
  }
}

function readFile (absoluteFilePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(absoluteFilePath, 'utf8', (err, contents) => {
      if (err) reject(err)
      else resolve(contents)
    })
  })
}

function getFilePathFromDiffFileName (fileName) {
  return fileName === '/dev/null' ? null : fileName
}

function getPathForPatch (patch) {
  return getFilePathFromDiffFileName(patch.newPath) || getFilePathFromDiffFileName(patch.oldPath)
}

function formatPatch (patch) {
  patch.oldPath = getFilePathFromDiffFileName(patch.oldFileName)
  patch.newPath = getFilePathFromDiffFileName(patch.newFileName)
  delete patch.oldFileName
  delete patch.newFileName
  delete patch.oldHeader
  delete patch.newHeader
  patch.hunks = patch.hunks.map(hunk => {
    return {
      oldStartLine: hunk.oldStart,
      oldLineCount: hunk.oldLines,
      newStartLine: hunk.newStart,
      newLineCount: hunk.newLines,
      lines: hunk.lines
    }
  })
  return patch
}

function buildAddedFilePatch (filePath, contents) {
  const noNewLine = contents[contents.length - 1] !== '\n'
  let lines = contents.trim().split(LINE_ENDING_REGEX).map(line => `+${line}`)
  if (noNewLine) lines.push('\\ No newline at end of file')
  return {
    oldFileName: '/dev/null',
    newFileName: filePath,
    status: 'added',
    hunks: [
      {
        lines: lines,
        oldStart: 0,
        oldLines: 0,
        newStart: 1,
        newLines: noNewLine ? lines.length - 1 : lines.length
      }
    ]
  }
}
