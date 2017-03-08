import {execFile} from 'child_process';

import GitPromptServer from '../lib/git-prompt-server';

describe('GitPromptServer', function() {
  it('prompts for user input and writes the response to stdout', async function() {
    this.timeout(10000);

    const server = new GitPromptServer();
    const {helper, socket, electron} = await server.start(query => {
      assert.equal(query.prompt, 'Please enter your credentials for https://what-is-your-favorite-color.com');
      assert.isTrue(query.includeUsername);
      return {
        username: 'old-man-from-scene-24',
        password: 'Green. I mean blue! AAAhhhh...',
      };
    });

    let err, stdout;
    await new Promise((resolve, reject) => {
      const child = execFile(electron,
        [helper, socket, 'get'],
        {
          env: {
            ELECTRON_RUN_AS_NODE: 1,
            ELECTRON_NO_ATTACH_CONSOLE: 1,
          },
        }, (_err, _stdout, _stderr) => {
          err = _err;
          stdout = _stdout;
          resolve();
        });

      child.stdin.write('protocol=https\n');
      child.stdin.write('host=what-is-your-favorite-color.com\n');
      child.stdin.end('\n');
    });

    assert.ifError(err);
    assert.equal(stdout,
      'protocol=https\nhost=what-is-your-favorite-color.com\n' +
      'username=old-man-from-scene-24\npassword=Green. I mean blue! AAAhhhh...\n');

    await server.terminate();
  });
});
