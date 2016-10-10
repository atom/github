/** @babel */
import {EventEmitter} from 'events'
import path from 'path'
import cp from 'child_process'

import GKS from 'git-kitchen-sink'

export default class GitProcess extends EventEmitter {
  constructor (args, options) {
    super()
    this.args = args
    this.options = options
    this.formatArgs = `git ${this.args.join(' ')} in ${this.options.cwd}`
    this.label = `git ${this.args.join(' ')} (stdin length ${this.options.stdin && this.options.stdin.length})@${new Date().getTime()}`
  }

  exec () {
    const options = {
      env: this.options.env,
      processCallback: (child) => {
        child.on('exit', (...args) => this.onChildExit(...args))
        child.on('error', (...args) => this.onChildError(...args))
        child.stdin.on('error', (...args) => this.onChildStdinError(...args))
      }
    }

    if (this.options.stdin) {
      options.stdin = this.options.stdin
      options.stdinEncoding = 'utf8'
    }
    
    return GKS.GitProcess.exec(this.args, this.options.cwd, options)
      .then(({stdout, stderr, exitCode}) => {
        if (exitCode) {
          const err = new Error(`${this.formatArgs} exited with code ${exitCode}\nstdout: ${stdout}\nstderr: ${stderr}`)
          err.code = exitCode
          err.command = this.formatArgs
          err.stdErr = stderr
          return Promise.reject(err)
        }
        return stdout
      })
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
