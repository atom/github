/** @babel */
import net from 'net'
import path from 'path'

import dedent from 'dedent-js'

import Prompt from './views/prompt'
import {writeFile, chmod, deleteFile, deleteFolder, getTempDir} from './helpers'

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
    this.helperPath = path.join(this.tmpFolderPath, 'helper')
    this.launcherPath = path.join(this.tmpFolderPath, 'launcher')

    const launcherText = getLauncherText(this.helperPath)
    const helperText = getHelperText(socketPath)
    await writeFile(launcherText, this.launcherPath)
    await writeFile(helperText, this.helperPath)
    await chmod(this.launcherPath, '755')
    await chmod(this.helperPath, '755')
    this.server = await this.startListening(socketPath)

    return this.launcherPath
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
    await Promise.all([
      deleteFile(this.helperPath),
      deleteFile(this.launcherPath)
    ])
    await deleteFolder(this.tmpFolderPath)
  }
}

function getAtomHelperPath () {
  if (process.platform === 'darwin') {
    return path.resolve(process.resourcesPath, '..', 'Frameworks',
     'Atom Helper.app', 'Contents', 'MacOS', 'Atom Helper')
  } else {
    return process.execPath
  }
}

function getLauncherText (credentialHelperPath) {
  return dedent`
    #!/bin/sh
    ELECTRON_RUN_AS_NODE=1 ELECTRON_NO_ATTACH_CONSOLE=1 "${getAtomHelperPath()}" "${credentialHelperPath}" "$@"
  `.trim()
}

function getHelperText (socketPath) {
  return dedent`
    const net = require('net')
    const sockPath = "${socketPath}"
    const query = process.argv[2]
    const socket = net.connect(sockPath, () => {
      socket.on('data', (data) => {
        console.log(data)
        process.exit(0)
      })
      socket.write(query + '\\u0000', 'utf8')
    })
    socket.setEncoding('utf8')
  `.trim()
}
