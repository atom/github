import {createRunner} from 'atom-mocha-test-runner';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
global.assert = chai.assert;

const reporter = process.env.APPVEYOR_API_URL ? 'mocha-appveyor-reporter' : 'spec';

module.exports = createRunner({
  reporter,
  overrideTestPaths: [/spec$/, /test/],
});
