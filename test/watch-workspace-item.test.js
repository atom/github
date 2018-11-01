import {watchWorkspaceItem} from '../lib/watch-workspace-item';

describe('watchWorkspaceItem', function() {
  let sub, atomEnv, workspace, component;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;

    component = {
      state: {},
      setState: sinon.stub().resolves(),
    };

    workspace.addOpener(uri => {
      if (uri.startsWith('atom-github://')) {
        return {
          getURI() { return uri; },
        };
      } else {
        return undefined;
      }
    });
  });

  afterEach(function() {
    sub && sub.dispose();
    atomEnv.destroy();
  });

  describe('initial state', function() {
    it('creates component state if none is present', function() {
      component.state = undefined;

      sub = watchWorkspaceItem(workspace, 'atom-github://item', component, 'aKey');
      assert.deepEqual(component.state, {aKey: false});
    });

    it('is false when the pane is not open', async function() {
      await workspace.open('atom-github://nonmatching');

      sub = watchWorkspaceItem(workspace, 'atom-github://item', component, 'someKey');
      assert.isFalse(component.state.someKey);
    });

    it('is true when the pane is already open', async function() {
      await workspace.open('atom-github://item/one');
      await workspace.open('atom-github://item/two');

      sub = watchWorkspaceItem(workspace, 'atom-github://item/one', component, 'theKey');

      assert.isTrue(component.state.theKey);
    });

    it('is true when multiple panes matching the URI pattern are open', async function() {
      await workspace.open('atom-github://item/one');
      await workspace.open('atom-github://item/two');
      await workspace.open('atom-github://nonmatch');

      sub = watchWorkspaceItem(workspace, 'atom-github://item/{pattern}', component, 'theKey');

      assert.isTrue(component.state.theKey);
    });
  });

  describe('workspace events', function() {
    it('becomes true when the pane is opened', async function() {
      sub = watchWorkspaceItem(workspace, 'atom-github://item/{pattern}', component, 'theKey');

      assert.isFalse(component.state.theKey);

      await workspace.open('atom-github://item/match');

      assert.isTrue(component.setState.calledWith({theKey: true}));
    });

    it('remains true if another matching pane is opened', async function() {
      await workspace.open('atom-github://item/match0');
      sub = watchWorkspaceItem(workspace, 'atom-github://item/{pattern}', component, 'theKey');

      assert.isTrue(component.state.theKey);

      await workspace.open('atom-github://item/match1');

      assert.isFalse(component.setState.called);
    });

    it('remains true if a matching pane is closed but another remains open', async function() {
      await workspace.open('atom-github://item/match0');
      await workspace.open('atom-github://item/match1');

      sub = watchWorkspaceItem(workspace, 'atom-github://item/{pattern}', component, 'theKey');
      assert.isTrue(component.state.theKey);

      assert.isTrue(workspace.hide('atom-github://item/match1'));

      assert.isFalse(component.setState.called);
    });

    it('becomes false if the last matching pane is closed', async function() {
      await workspace.open('atom-github://item/match0');
      await workspace.open('atom-github://item/match1');

      sub = watchWorkspaceItem(workspace, 'atom-github://item/{pattern}', component, 'theKey');
      assert.isTrue(component.state.theKey);

      assert.isTrue(workspace.hide('atom-github://item/match1'));
      assert.isTrue(workspace.hide('atom-github://item/match0'));

      assert.isTrue(component.setState.calledWith({theKey: false}));
    });
  });

  it('stops updating when disposed', async function() {
    sub = watchWorkspaceItem(workspace, 'atom-github://item', component, 'theKey');
    assert.isFalse(component.state.theKey);

    sub.dispose();
    await workspace.open('atom-github://item');
    assert.isFalse(component.setState.called);

    await workspace.hide('atom-github://item');
    assert.isFalse(component.setState.called);
  });
});
