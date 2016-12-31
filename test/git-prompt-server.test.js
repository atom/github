/** @babel */

import {exec} from 'child_process';
import fs from 'fs';

import GitPromptServer from '../lib/git-prompt-server';

// Will not pass on Appveyor
if (process.platform !== 'win32') {
  describe('GitPromptServer', () => {
    it('prompts for user input and writes the response to stdout', async () => {
      const server = new GitPromptServer();
      const {helper, socket, electron} = await server.start(question => {
        assert.equal(question, 'What... is your favorite color?\u0000');
        return 'Green. I mean blue! AAAhhhh...';
      });

      await new Promise(resolve => {
        const command = `"${electron}" "${helper}" "${socket}" "What... is your favorite color?"`;
        exec(command, {
          env: {
            ELECTRON_RUN_AS_NODE: 1,
            ELECTRON_NO_ATTACH_CONSOLE: 1,
          },
        }, (err, stdout, stderr) => {
          assert.isNull(err);
          assert.equal(stdout, 'Green. I mean blue! AAAhhhh...\n');
          resolve();
        });
      });

      await server.terminate();
    });
  });
}
