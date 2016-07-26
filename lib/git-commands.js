/** @babel */

import {exec} from './git-process'

export async function diff (args, path) {
  const output = await exec(['diff'].concat(args), path)

  if (args.includes('--name-status')) {
    return output.trim().split('\n').reduce((acc, line) => {
      const [status, name] = line.split('	')
      acc[name] = status
      return acc
    }, {})
  }
}
