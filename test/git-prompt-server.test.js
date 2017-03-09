import {execFile} from 'child_process';

import GitPromptServer from '../lib/git-prompt-server';

describe('GitPromptServer', function() {
  describe('credential helper', function() {
    it('prompts for user input and writes JSON to stdout', async function() {
      this.timeout(10000);

      const server = new GitPromptServer();
      const {credentialHelper, socket, electron} = await server.start(query => {
        assert.equal(query.prompt, 'Please enter your credentials for https://what-is-your-favorite-color.com');
        assert.isTrue(query.includeUsername);
        return {
          username: 'old-man-from-scene-24',
          password: 'Green. I mean blue! AAAhhhh...',
        };
      });

      let err, stdout;
      await new Promise((resolve, reject) => {
        const child = execFile(
          credentialHelper.launcher,
          ['get'],
          {
            env: {
              ATOM_GITHUB_ELECTRON_PATH: electron,
              ATOM_GITHUB_SOCK_PATH: socket,
              ATOM_GITHUB_CREDENTIAL_PATH: credentialHelper.script,
            },
          },
          (_err, _stdout, _stderr) => {
            err = _err;
            stdout = _stdout;
            resolve();
          },
        );

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

  describe('askpass helper', function() {
    it('prompts for user input and writes the response to stdout', async function() {
      this.timeout(10000);

      const server = new GitPromptServer();
      const {askPass, socket, electron} = await server.start(query => {
        assert.equal(query.prompt, 'Please enter your password for "updog"');
        assert.isFalse(query.includeUsername);
        return {
          password: "What's 'updog'?",
        };
      });

      let err, stdout;
      await new Promise((resolve, reject) => {
        execFile(
          askPass.launcher,
          ['Please enter your password for "updog"'],
          {
            env: {
              ATOM_GITHUB_ELECTRON_PATH: electron,
              ATOM_GITHUB_SOCK_PATH: socket,
              ATOM_GITHUB_ASKPASS_PATH: askPass.script,
            },
          },
          (_err, _stdout, _stderr) => {
            err = _err;
            stdout = _stdout;
            resolve();
          },
        );
      });

      assert.ifError(err);
      assert.equal(stdout, "What's 'updog'?");

      await server.terminate();
    });
  });
});
