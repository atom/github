import React from 'react';
import {mount} from 'enzyme';
import {CompositeDisposable} from 'event-kit';

import IssueishPaneItem from '../../lib/items/issueish-pane-item';
import PaneItem from '../../lib/atom/pane-item';
import {issueishPaneItemProps} from '../fixtures/props/issueish-pane-props';

describe('IssueishPaneItem', function() {
  let atomEnv, subs;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    subs = new CompositeDisposable();
  });

  afterEach(function() {
    subs.dispose();
    atomEnv.destroy();
  });

  function buildApp(overrideProps = {}) {
    const props = issueishPaneItemProps(overrideProps);

    return (
      <PaneItem workspace={atomEnv.workspace} uriPattern={IssueishPaneItem.uriPattern}>
        {({itemHolder, params}) => (
          <IssueishPaneItem
            ref={itemHolder.setter}
            {...params}
            issueishNumber={parseInt(params.issueishNumber, 10)}
            {...props}
          />
        )}
      </PaneItem>
    );
  }

  it('renders within the workspace center', async function() {
    const wrapper = mount(buildApp({}));

    const uri = IssueishPaneItem.buildURI('one.com', 'me', 'code', 400, __dirname);
    const item = await atomEnv.workspace.open(uri);

    assert.lengthOf(wrapper.update().find('IssueishPaneItem'), 1);

    const centerPaneItems = atomEnv.workspace.getCenter().getPaneItems();
    assert.include(centerPaneItems.map(i => i.getURI()), uri);

    assert.strictEqual(item.getURI(), uri);
    assert.strictEqual(item.getTitle(), 'me/code#400');
  });

  it('switches to a different issueish', async function() {
    const wrapper = mount(buildApp({}));
    await atomEnv.workspace.open(IssueishPaneItem.buildURI('host.com', 'me', 'original', 1, __dirname));

    const before = wrapper.update().find('IssueishDetailContainer');
    assert.strictEqual(before.prop('host'), 'host.com');
    assert.strictEqual(before.prop('owner'), 'me');
    assert.strictEqual(before.prop('repo'), 'original');
    assert.strictEqual(before.prop('issueishNumber'), 1);

    wrapper.find('IssueishDetailContainer').prop('switchToIssueish')('you', 'switched', 2);

    const after = wrapper.update().find('IssueishDetailContainer');
    assert.strictEqual(after.prop('host'), 'host.com');
    assert.strictEqual(after.prop('owner'), 'you');
    assert.strictEqual(after.prop('repo'), 'switched');
    assert.strictEqual(after.prop('issueishNumber'), 2);
  });

  it('reconstitutes its original URI', async function() {
    const wrapper = mount(buildApp({}));

    const uri = IssueishPaneItem.buildURI('host.com', 'me', 'original', 1, __dirname);
    const item = await atomEnv.workspace.open(uri);
    assert.strictEqual(item.getURI(), uri);
    assert.strictEqual(item.serialize().uri, uri);

    wrapper.update().find('IssueishDetailContainer').prop('switchToIssueish')('you', 'switched', 2);

    assert.strictEqual(item.getURI(), uri);
    assert.strictEqual(item.serialize().uri, uri);
  });

  it('broadcasts title changes', async function() {
    const wrapper = mount(buildApp({}));
    const item = await atomEnv.workspace.open(IssueishPaneItem.buildURI('host.com', 'user', 'repo', 1, __dirname));
    assert.strictEqual(item.getTitle(), 'user/repo#1');

    const handler = sinon.stub();
    subs.add(item.onDidChangeTitle(handler));

    wrapper.update().find('IssueishDetailContainer').prop('onTitleChange')('SUP');
    assert.strictEqual(handler.callCount, 1);
    assert.strictEqual(item.getTitle(), 'SUP');

    wrapper.update().find('IssueishDetailContainer').prop('onTitleChange')('SUP');
    assert.strictEqual(handler.callCount, 1);
  });

  it('tracks pending state termination', async function() {
    mount(buildApp({}));
    const item = await atomEnv.workspace.open(IssueishPaneItem.buildURI('host.com', 'user', 'repo', 1, __dirname));

    const handler = sinon.stub();
    subs.add(item.onDidTerminatePendingState(handler));

    item.terminatePendingState();
    assert.strictEqual(handler.callCount, 1);

    item.terminatePendingState();
    assert.strictEqual(handler.callCount, 1);
  });
});
