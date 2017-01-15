import {createRunner} from 'atom-mocha-test-runner';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
global.assert = chai.assert;

module.exports = createRunner({
  'spec',
  overrideTestPaths: [/spec$/, /test/],
}, mocha => {
  if (process.env.APPVEYOR_API_URL) {
    mocha.reporter(require('mocha-appveyor-reporter'));
  }
});
