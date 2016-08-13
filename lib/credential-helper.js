/** @babel */
import net from 'net'
import path from 'path'

import Prompt from './views/prompt'
import {deleteFolder, getTempDir} from './helpers'

function getAtomHelperPath () {
  if (process.platform === 'darwin') {
    return path.resolve(process.resourcesPath, '..', 'Frameworks',
     'Atom Helper.app', 'Contents', 'MacOS', 'Atom Helper')
  } else {
    return process.execPath
  }
}

function getInputViaPrompt (query) {
  return new Promise((resolve, reject) => {
    let panel
    const component = new Prompt({
      message: query,
      onCancel: () => {
        reject()
        panel.destroy()
        component.destroy(false)
      },
      onSubmit: (answer) => {
        resolve(answer)
        panel.destroy()
        component.destroy(false)
      }
    })
    panel = atom.workspace.addModalPanel({item: component})
  })
}

export default class CredentialHelper {
  async start (promptForInput = getInputViaPrompt) {
    // TODO: [mkt] Windows??
    this.promptForInput = promptForInput
    this.tmpFolderPath = await getTempDir('/tmp/github-credential-helper-')
    const socketPath = path.join(this.tmpFolderPath, 'helper.sock')
    this.server = await this.startListening(socketPath)

    return {
      socket: socketPath,
      electron: getAtomHelperPath(),
      launcher: path.resolve(__dirname, '..', 'bin', 'credential-helper-launcher.sh'),
      helper: path.resolve(__dirname, '..', 'bin', 'credential-helper-script.js')
    }
  }

  startListening (socketPath) {
    return new Promise(resolve => {
      const server = net.createServer(connection => {
        connection.setEncoding('utf8')
        connection.on('data', (data) => this.handleData(connection, data))
      })

      server.listen(socketPath, () => resolve(server))
    })
  }

  handleData (connection, data) {
    Promise.resolve(this.promptForInput(data))
      .then(answer => {
        connection.write(answer)
      })
      .catch(() => {
        connection.write('\n')
      })
  }

  async terminate () {
    await new Promise(resolve => this.server.close(resolve))
    await deleteFolder(this.tmpFolderPath)
  }
}
