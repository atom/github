/** @babel */
import {EventEmitter} from 'events'
import path from 'path'
import cp from 'child_process'

function resolveGit () {
  // return '/usr/bin/git' // TODO [mkt/ku] why do we need this for https endpoints?
  if (process.platform === 'darwin') {
    return path.join(__dirname, '../git-distributions/git-macos/git/bin/git')
  // } else if (process.platform === 'win32') {
  //   return path.join(__dirname, 'git/cmd/git.exe')
  } else {
    throw new Error('Git not supported on platform: ' + process.platform)
  }
}

export default class GitProcess extends EventEmitter {
  constructor (args, options) {
    super()
    this.args = args
    this.options = options
    this.formatArgs = `git ${this.args.join(' ')} in ${this.options.cwd}`
    this.label = `git ${this.args.join(' ')} (stdin length ${this.options.stdin && this.options.stdin.length})@${new Date().getTime()}`
  }

  exec () {
    return new Promise(async (resolve, reject) => {
      if (global.PRINT_GIT_TIMES) console.time(this.label)

      const opts = {
        cwd: this.options.cwd,
        encoding: 'utf8',
        env: {...process.env, ...this.options.env}
      }

      const child = cp.execFile(resolveGit(), this.args, opts, (...args) => {
        this.onComplete(resolve, reject, ...args)
      })

      child.on('exit', (...args) => this.onChildExit(...args))
      child.on('error', (...args) => this.onChildError(...args))
      child.stdin.on('error', (...args) => this.onChildStdinError(...args))

      if (this.options.stdin) {
        child.stdin.end(this.options.stdin)
      }
    })
  }

  onComplete (resolve, reject, err, output, stdErr) {
    if (err) {
      err.command = this.formatArgs
      err.stdErr = stdErr
      return reject(err)
    }
    resolve(output)
  }

  onChildExit (code) {
    if (global.PRINT_GIT_TIMES) console.timeEnd(this.label)
    this.emit('exit', code)
  }

  onChildError (err) {
    console.error('Error executing: ' + this.formatArgs)
    console.error(err.stack)
    this.emit('error', err)
  }

  onChildStdinError (err) {
    console.error('Error writing to process: ' + this.formatArgs)
    console.error(err.stack)
    console.error('Tried to write: ' + this.options.stdin)
  }
}
