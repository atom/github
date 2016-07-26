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


// Execute a command and read the output using the embedded Git environment
export function exec (args, path) {
  return new Promise((resolve, reject) => {
    const formatArgs = 'executing: git ' + args.join(' ')

    cp.execFile(resolveGit(), args, { cwd: path, encoding: 'utf8' }, (err, output, stdErr) => {
      if (err) {
        console.error(formatArgs)
        console.error(err)
        return reject(err)
      }

      console.log(formatArgs)
      resolve(output)
    })
  })
}
