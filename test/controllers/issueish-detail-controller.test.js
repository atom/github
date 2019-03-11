import React from 'react';
import {shallow} from 'enzyme';

import * as reporterProxy from '../../lib/reporter-proxy';
import CommitDetailItem from '../../lib/items/commit-detail-item';
import {BareIssueishDetailController} from '../../lib/controllers/issueish-detail-controller';
import PullRequestCheckoutController from '../../lib/controllers/pr-checkout-controller';
import PullRequestDetailView from '../../lib/views/pr-detail-view';
import EnableableOperation from '../../lib/models/enableable-operation';
import {issueishDetailControllerProps} from '../fixtures/props/issueish-pane-props';

describe('IssueishDetailController', function() {
  let atomEnv;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();

    atomEnv.workspace.addOpener(uri => {
      if (uri.startsWith('atom-github://')) {
        return {
          getURI() { return uri; },
        };
      }

      return undefined;
    });
  });

  afterEach(function() {
    atomEnv.destroy();
  });

  function buildApp(opts, overrideProps = {}) {
    const props = issueishDetailControllerProps(opts, {workspace: atomEnv.workspace, ...overrideProps});
    return <BareIssueishDetailController {...props} />;
  }

  it('updates the pane title for a pull request on mount', function() {
    const onTitleChange = sinon.stub();
    shallow(buildApp({
      repositoryName: 'reponame',
      ownerLogin: 'ownername',
      issueishNumber: 12,
      pullRequestTitle: 'the title',
    }, {onTitleChange}));

    assert.isTrue(onTitleChange.calledWith('PR: ownername/reponame#12 — the title'));
  });

  it('updates the pane title for an issue on mount', function() {
    const onTitleChange = sinon.stub();
    shallow(buildApp({
      repositoryName: 'reponame',
      ownerLogin: 'ownername',
      issueKind: 'Issue',
      issueishNumber: 34,
      omitPullRequestData: true,
      issueTitle: 'the title',
    }, {onTitleChange}));
    assert.isTrue(onTitleChange.calledWith('Issue: ownername/reponame#34 — the title'));
  });

  it('updates the pane title on update', function() {
    const onTitleChange = sinon.stub();
    const wrapper = shallow(buildApp({
      repositoryName: 'reponame',
      ownerLogin: 'ownername',
      issueishNumber: 12,
      pullRequestTitle: 'the title',
    }, {onTitleChange}));
    assert.isTrue(onTitleChange.calledWith('PR: ownername/reponame#12 — the title'));

    wrapper.setProps(issueishDetailControllerProps({
      repositoryName: 'different',
      ownerLogin: 'new',
      issueishNumber: 34,
      pullRequestTitle: 'the title',
    }, {onTitleChange}));

    assert.isTrue(onTitleChange.calledWith('PR: new/different#34 — the title'));
  });

  it('leaves the title alone and renders a message if no repository was found', function() {
    const onTitleChange = sinon.stub();
    const wrapper = shallow(buildApp({}, {onTitleChange, repository: null, issueishNumber: 123}));
    assert.isFalse(onTitleChange.called);
    assert.match(wrapper.find('div').text(), /#123 not found/);
  });

  it('leaves the title alone and renders a message if no issueish was found', function() {
    const onTitleChange = sinon.stub();
    const wrapper = shallow(buildApp({omitIssueData: true, omitPullRequestData: true}, {onTitleChange, issueishNumber: 123}));
    assert.isFalse(onTitleChange.called);
    assert.match(wrapper.find('div').text(), /#123 not found/);
  });

  describe('openCommit', function() {
    beforeEach(async function() {
      sinon.stub(reporterProxy, 'addEvent');

      const checkoutOp = new EnableableOperation(() => {}).disable("I don't feel like it");

      const wrapper = shallow(buildApp({}, {workdirPath: __dirname}));
      const checkoutWrapper = wrapper.find(PullRequestCheckoutController).renderProp('children')(checkoutOp);
      await checkoutWrapper.find(PullRequestDetailView).prop('openCommit')({sha: '1234'});
    });

    it('opens a CommitDetailItem in the workspace', function() {
      assert.include(
        atomEnv.workspace.getPaneItems().map(item => item.getURI()),
        CommitDetailItem.buildURI(__dirname, '1234'),
      );
    });

    it('reports an event', function() {
      assert.isTrue(
        reporterProxy.addEvent.calledWith(
          'open-commit-in-pane', {package: 'github', from: 'BareIssueishDetailController'},
        ),
      );
    });
  });
});
