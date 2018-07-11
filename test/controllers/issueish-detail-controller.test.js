import React from 'react';
import {shallow} from 'enzyme';

import {BareIssueishDetailController} from '../../lib/controllers/issueish-detail-controller';
import {issueishDetailControllerProps} from '../fixtures/props/issueish-pane-props';

describe('IssueishDetailController', function() {
  function buildApp(opts, overrideProps = {}) {
    return <BareIssueishDetailController {...issueishDetailControllerProps(opts, overrideProps)} />;
  }

  it('updates the pane title for a pull request on mount', function() {
    const onTitleChange = sinon.stub();
    shallow(buildApp({
      repositoryName: 'reponame',
      ownerLogin: 'ownername',
      issueishNumber: 12,
      issueishTitle: 'the title',
    }, {onTitleChange}));

    assert.isTrue(onTitleChange.calledWith('PR: ownername/reponame#12 — the title'));
  });

  it('updates the pane title for an issue on mount', function() {
    const onTitleChange = sinon.stub();
    shallow(buildApp({
      repositoryName: 'reponame',
      ownerLogin: 'ownername',
      issueishKind: 'Issue',
      issueishNumber: 34,
      issueishTitle: 'the title',
    }, {onTitleChange}));

    assert.isTrue(onTitleChange.calledWith('Issue: ownername/reponame#34 — the title'));
  });

  it('updates the pane title on update', function() {
    const onTitleChange = sinon.stub();
    const wrapper = shallow(buildApp({
      repositoryName: 'reponame',
      ownerLogin: 'ownername',
      issueishNumber: 12,
      issueishTitle: 'the title',
    }, {onTitleChange}));
    assert.isTrue(onTitleChange.calledWith('PR: ownername/reponame#12 — the title'));

    wrapper.setProps(issueishDetailControllerProps({
      repositoryName: 'different',
      ownerLogin: 'new',
      issueishNumber: 34,
      issueishTitle: 'the title',
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
    const wrapper = shallow(buildApp({omitIssueish: true}, {onTitleChange, issueishNumber: 123}));
    assert.isFalse(onTitleChange.called);
    assert.match(wrapper.find('div').text(), /#123 not found/);
  });
});
