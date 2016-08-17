/** @babel */

import {execFile} from 'child_process'

import CredentialHelper from '../lib/credential-helper'

xdescribe('CredentialHelper', () => {
  it('prompts for user input and writes the response to stdout', async () => {
    const helper = new CredentialHelper()
    const launchPath = await helper.start((question) => {
      assert.equal(question, 'What... is your favorite color?\u0000')
      return 'Green. I mean blue! AAAhhhh...'
    })

    await new Promise(resolve => {
      const cp = execFile(launchPath, ['What... is your favorite color?'], (err, stdout, stderr) => {
        assert.isNull(err)
        assert.equal(stdout, 'Green. I mean blue! AAAhhhh...\n')
        resolve()
      })

      cp.on('exit', () => console.log('exit'))
    })

    await helper.terminate()
  })
})
