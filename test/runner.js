import {createRunner} from 'atom-mocha-test-runner';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import AppVeyorReporter from 'mocha-appveyor-reporter';

chai.use(chaiAsPromised);
global.assert = chai.assert;

const reporter = process.env.APPVEYOR_API_URL ? AppVeyorReporter : 'spec';

module.exports = createRunner({
  reporter,
  overrideTestPaths: [/spec$/, /test/],
});
