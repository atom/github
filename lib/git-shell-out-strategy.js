/** @babel */
import path from 'path'
import cp from 'child_process'

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

  async diffFileStatus (options = {}) {
    let args = ['diff', '--name-status']
    if (options.target) args = args.concat(options.target)
    if (options.fileNames) args = args.concat(['--', ...options.fileNames])
    const output = await this.exec(args)
    return output.trim().split('\n').reduce((acc, line) => {
      const [status, name] = line.split('	')
      acc[name] = status
      return acc
    }, {})
  }

  applyPatchToIndex (patch) {
    return this.exec(['apply', '--cached', '-'], patch)
  }

  stageFile (path) {
    return this.exec(['add', path])
  }
}
