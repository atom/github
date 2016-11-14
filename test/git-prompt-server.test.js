/** @babel */

import {execFile} from 'child_process'

import GitPromptServer from '../lib/git-prompt-server'

describe('GitPromptServer', () => {
  it('prompts for user input and writes the response to stdout', async () => {
    const server = new GitPromptServer()
    const {helper, socket} = await server.start((question) => {
      assert.equal(question, 'What... is your favorite color?\u0000')
      return 'Green. I mean blue! AAAhhhh...'
    })

    await new Promise(resolve => {
      const cp = execFile(helper, [socket, 'What... is your favorite color?'], (err, stdout, stderr) => {
        assert.isNull(err)
        assert.equal(stdout, 'Green. I mean blue! AAAhhhh...\n')
        resolve()
      })
    })

    await server.terminate()
  })
})
