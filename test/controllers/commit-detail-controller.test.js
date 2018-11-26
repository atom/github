import React from 'react';
import moment from 'moment';
import {shallow, mount} from 'enzyme';

import {cloneRepository, buildRepository} from '../helpers';
import CommitDetailItem from '../../lib/items/commit-detail-item';
import CommitDetailController from '../../lib/controllers/commit-detail-controller';
import Commit from '../../lib/models/commit';
import {multiFilePatchBuilder} from '../builder/patch';

describe.only('CommitDetailController', function() {

  let atomEnv, repository, commit;

  beforeEach(async function() {
    atomEnv = global.buildAtomEnvironment();
    repository = await buildRepository(await cloneRepository('multiple-commits'));
    commit = await repository.getCommit('18920c900bfa6e4844853e7e246607a31c3e2e8c');
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(override = {}) {
    const props = {
      repository,
      commit,
      itemType: CommitDetailItem,

      workspace: atomEnv.workspace,
      commands: atomEnv.commands,
      keymaps: atomEnv.keymaps,
      tooltips: atomEnv.tooltips,
      config: atomEnv.config,
      destroy: () => {},

      ...override,
    };

    return <CommitDetailController {...props} />;
  }

  it('sets `disableStageUnstage` flag to true for MultiFilePatchController', function() {
    const wrapper = mount(buildApp());
    assert.strictEqual(wrapper.find('MultiFilePatchController').prop('disableStageUnstage'), true);
  });

  it('passes unrecognized props to a MultiFilePatchController', function() {
    const extra = Symbol('extra');
    const wrapper = shallow(buildApp({extra}));

    assert.strictEqual(wrapper.find('MultiFilePatchController').prop('extra'), extra);
  });

  it('renders commit details properly', function() {
    const newCommit = new Commit({
      sha: '420',
      authorEmail: 'very@nice.com',
      authorDate: moment().subtract(2, 'days').unix(),
      messageSubject: 'subject',
      messageBody: 'messageBody 🌙',
    });
    const {multiFilePatch: mfp} = multiFilePatchBuilder().addFilePatch().build();
    sinon.stub(newCommit, 'getMultiFileDiff').returns(mfp);
    const wrapper = mount(buildApp({commit: newCommit}));

    assert.strictEqual(wrapper.find('h3.github-CommitDetailView-title').text(), 'subject');
    assert.strictEqual(wrapper.find('pre.github-CommitDetailView-moreText').text(), 'messageBody 🌙');
    assert.strictEqual(wrapper.find('span.github-CommitDetailView-metaText').text(), 'very@nice.com committed 2 days ago');

  });

});
