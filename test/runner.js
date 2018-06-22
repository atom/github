import {createRunner} from 'atom-mocha-test-runner';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import path from 'path';

import until from 'test-until';
import NYC from 'nyc';

chai.use(chaiAsPromised);
global.assert = chai.assert;

// Give tests that rely on filesystem event delivery lots of breathing room.
until.setDefaultTimeout(parseInt(process.env.UNTIL_TIMEOUT || '3000', 10));

if (process.env.NYC_CONFIG) {
  const parentPid = process.env.NYC_PARENT_PID || '0';
  process.env.NYC_PARENT_PID = process.pid;

  const config = JSON.parse(process.env.NYC_CONFIG);
  config.isChildProcess = true;
  config._processInfo = {
    ppid: parentPid,
    root: process.env.NYC_ROOT_ID,
  };
  global._nyc = new NYC(config);
  global._nyc.wrap();
}

module.exports = createRunner({
  htmlTitle: `GitHub Package Tests - pid ${process.pid}`,
  reporter: process.env.MOCHA_REPORTER || 'spec',
  overrideTestPaths: [/spec$/, /test/],
}, mocha => {
  const Enzyme = require('enzyme');
  const Adapter = require('@smashwilson/enzyme-adapter-react-16');
  Enzyme.configure({adapter: new Adapter()});

  require('mocha-stress');

  mocha.timeout(parseInt(process.env.MOCHA_TIMEOUT || '5000', 10));

  if (process.env.TEST_JUNIT_XML_PATH) {
    mocha.reporter(require('mocha-junit-and-console-reporter'), {
      mochaFile: process.env.TEST_JUNIT_XML_PATH,
    });
  } else if (process.env.APPVEYOR_API_URL) {
    mocha.reporter(require('mocha-appveyor-reporter'));
  } else if (process.env.CIRCLECI === 'true') {
    mocha.reporter(require('mocha-junit-and-console-reporter'), {
      mochaFile: path.join('test-results', 'mocha', 'test-results.xml'),
    });
  }
});
