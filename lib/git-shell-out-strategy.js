/** @babel */
import path from 'path'

import {GitProcess} from 'git-kitchen-sink'
import {parse as parseDiff} from 'what-the-diff'

import AsyncQueue from './async-queue'
import {readFile, fsStat} from './helpers'

const LINE_ENDING_REGEX = /\r?\n/

process.env.PRINT_GIT_TIMES = true

export default class GitShellOutStrategy {
  constructor (workingDir) {
    this.workingDir = workingDir
    this.commandQueue = new AsyncQueue()
  }

  // Execute a command and read the output using the embedded Git environment
  async exec (args, stdin = null) {
    return this.commandQueue.push(async () => {
      const formattedArgs = `git ${args.join(' ')} in ${this.workingDir}`
      const options = {
        processCallback: (child) => {
          child.on('error', (err) => {
            console.error('Error executing: ' + formattedArgs)
            console.error(err.stack)
          })
          child.stdin.on('error', (err) => {
            console.error('Error writing to process: ' + formattedArgs)
            console.error(err.stack)
            console.error('Tried to write: ' + this.options.stdin)
          })
        }
      }

      if (stdin) {
        options.stdin = stdin
        options.stdinEncoding = 'utf8'
      }

      if (process.env.PRINT_GIT_TIMES) {
        console.time(`git:${formattedArgs}`)
      }
      return GitProcess.exec(args, this.workingDir, options)
        .then(({stdout, stderr, exitCode}) => {
          if (process.env.PRINT_GIT_TIMES) {
            console.timeEnd(`git:${formattedArgs}`)
          }
          if (exitCode) {
            const err = new Error(`${formattedArgs} exited with code ${exitCode}\nstdout: ${stdout}\nstderr: ${stderr}`)
            err.code = exitCode
            err.command = formattedArgs
            err.stdErr = stderr
            return Promise.reject(err)
          }
          return stdout
        })
    })
  }

  async isGitRepository () {
    try {
      await this.exec(['rev-parse', '--resolve-git-dir', path.join(this.workingDir, '.git')])
      return true
    } catch (e) {
      return false
    }
  }

  /**
   * Staging/Unstaging files and patches and committing
   */
  stageFiles (paths) {
    if (paths.length === 0) return
    const args = ['add'].concat(paths)
    return this.exec(args)
  }

  unstageFiles (paths, commit = 'HEAD') {
    if (paths.length === 0) return
    const args = ['reset', commit, '--' ].concat(paths)
    return this.exec(args)
  }

  applyPatchToIndex (patch) {
    return this.exec(['apply', '--cached', '-'], patch)
  }

  commit (message, {allowEmpty, amend} = {}) {
    const args = ['commit', '-m', message, '--no-gpg-sign']
    if (amend) args.push('--amend')
    if (allowEmpty) args.push('--allow-empty')
    return this.exec(args)
  }

  /**
   * File Status and Diffs
   */
  async diffFileStatus (options = {}) {
    const args = ['diff', '--name-status', '--no-renames']
    if (options.staged) args.push('--staged')
    if (options.target) args.push(options.target)
    if (options.diffFilter === 'unmerged') args.push('--diff-filter=U')
    const output = await this.exec(args)
    const untracked = await this.getUntrackedFiles()

    const statusMap = {
      A: 'added',
      M: 'modified',
      D: 'deleted',
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
    const output = await this.exec(['ls-files', '--others', '--exclude-standard'])
    if (output.trim() === '') return []
    return output.trim().split(LINE_ENDING_REGEX)
  }

  async diff (options = {}) {
    const args = ['diff', '--no-prefix', '--no-renames', '--diff-filter=u']
    if (options.staged) args.push('--staged')
    if (options.baseCommit) args.push(options.baseCommit)
    let output = await this.exec(args)

    let rawDiffs = []
    if (output) rawDiffs = parseDiff(output).filter(rawDiff => rawDiff.status !== 'unmerged')

    if (!options.staged) {
      // add untracked files
      const untrackedFilePatches = await Promise.all((await this.getUntrackedFiles()).map(async (filePath) => {
        const absPath = path.join(this.workingDir, filePath)
        const stats = await fsStat(absPath)
        const contents = await readFile(absPath)
        return buildAddedFilePatch(filePath, contents, stats)
      }))
      rawDiffs = rawDiffs.concat(untrackedFilePatches)
    }

    return rawDiffs.sort((a, b) => (a.newPath || a.oldPath).localeCompare(b.newPath || b.oldPath))
  }

  /**
   * Miscellaneous getters
   */
  async getCommit (ref) {
    const [sha, message] = (await this.exec(['log', '--pretty=%H%x00%B%x00', '--no-abbrev-commit', '-1', ref])).split('\0')
    return {sha, message: message.trim()}
  }

  getHeadCommit () {
    return this.getCommit('HEAD')
  }

  readFileFromIndex (path) {
    return this.exec(['show', `:${path}`])
  }

  /**
   * Merge
   */
  merge (branchName) {
    return this.exec(['merge', branchName])
  }

  async getMergeConflictFileStatus () {
    const output = await this.exec(['status', '--short'])
    const statusToHead = await this.diffFileStatus({target: 'HEAD'})

    const statusMap = {
      A: 'added',
      U: 'modified',
      D: 'deleted'
    }

    const statusesByPath = {}
    output && output.trim().split(LINE_ENDING_REGEX).forEach(line => {
      const [oursTheirsStatus, filePath] = line.split(' ')
      if (['DD', 'AU', 'UD', 'UA', 'DU', 'AA', 'UU'].includes(oursTheirsStatus)) {
        statusesByPath[filePath] = {
          ours: statusMap[oursTheirsStatus[0]],
          theirs: statusMap[oursTheirsStatus[1]],
          file: statusToHead[filePath] || 'equivalent'
        }
      }
    })
    return statusesByPath
  }

  async isMerging () {
    try {
      await readFile(path.join(this.workingDir, '.git', 'MERGE_HEAD'))
      return true
    } catch (e) {
      return false
    }
  }

  abortMerge () {
    return this.exec(['merge', '--abort'])
  }

  /**
   * Remote interactions
   */
  clone (remoteUrl, options = {}) {
    const args = ['clone', '--no-local', remoteUrl, this.workingDir]
    if (options.bare) args.push('--bare')
    return this.exec(args)
  }

  async getRemoteForBranch (branchName) {
    try {
      const output = await this.exec(['config', `branch.${branchName}.remote`])
      return output.trim()
    } catch (e) {
      return null
    }
  }

  async fetch (branchName) {
    try {
      const remote = await this.getRemoteForBranch(branchName)
      const output = await this.exec(['fetch', remote, branchName])
      return output
    } catch (e) {
      console.error(e)
    }
  }

  async push (branchName, options = {}) {
    let remote = await this.getRemoteForBranch(branchName)
    const args = ['push', remote || 'origin', branchName]
    if (options.setUpstream) args.push('--set-upstream')
    if (options.force) args.push('--force')
    return this.exec(args)
  }

  async getAheadCount (branchName) {
    const remote = await this.getRemoteForBranch(branchName)
    if (remote) {
      const output = await this.exec(['rev-list', `${remote}/${branchName}..${branchName}`])
      return output.trim().split(LINE_ENDING_REGEX).filter(s => s.trim()).length
    } else {
      return null
    }
  }

  async getBehindCount (branchName) {
    const remote = await this.getRemoteForBranch(branchName)
    if (remote) {
      const output = await this.exec(['rev-list', `${branchName}..${remote}/${branchName}`])
      return output.trim().split(LINE_ENDING_REGEX).filter(s => s.trim()).length
    } else {
      return null
    }
  }

  /**
   * Branches
   */
  async getCurrentBranch () {
    const output = await this.exec(['rev-parse', '--abbrev-ref', 'HEAD'])
    return output.trim()
  }

  checkout (branchName, options = {}) {
    const args = ['checkout']
    if (options.createNew) args.push('-b')
    return this.exec(args.concat(branchName))
  }

  async getBranches () {
    const output = await this.exec(['branch'])
    return output.trim().split(LINE_ENDING_REGEX)
      .map(branchName => branchName.trim().replace(/^\* /, ''))
  }
}

function buildAddedFilePatch (filePath, contents, stats) {
  const hunks = []
  if (contents) {
    const noNewLine = contents[contents.length - 1] !== '\n'
    let lines = contents.trim().split(LINE_ENDING_REGEX).map(line => `+${line}`)
    if (noNewLine) lines.push('\\ No newline at end of file')
    hunks.push({
      lines: lines,
      oldStartLine: 0,
      oldLineCount: 0,
      newStartLine: 1,
      newLineCount: noNewLine ? lines.length - 1 : lines.length
    })
  }
  const executable = Boolean((stats >> 6) && 1)
  return {
    oldPath: null,
    newPath: filePath,
    oldMode: null,
    newMode: executable ? '100755' : '100644',
    status: 'added',
    hunks: hunks
  }
}
