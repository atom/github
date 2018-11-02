import {watchWorkspaceItem} from '../lib/watch-workspace-item';
import URIPattern from '../lib/atom/uri-pattern';

describe.only('watchWorkspaceItem', function() {
  let sub, atomEnv, workspace, component;

  beforeEach(function() {
    atomEnv = global.buildAtomEnvironment();
    workspace = atomEnv.workspace;

    component = {
      state: {},
      setState: sinon.stub().callsFake((updater, cb) => cb && cb()),
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

    it('accepts a preconstructed URIPattern', async function() {
      await workspace.open('atom-github://item/one');
      const u = new URIPattern('atom-github://item/{pattern}');

      sub = watchWorkspaceItem(workspace, u, component, 'theKey');
      assert.isTrue(component.state.theKey);
    });

    describe('{active: true}', function() {
      it('is false when the pane is not open', async function() {
        await workspace.open('atom-github://nonmatching');

        sub = watchWorkspaceItem(workspace, 'atom-github://item', component, 'someKey', {active: true});
        assert.isFalse(component.state.someKey);
      });

      it('is false when the pane is open, but not active', async function() {
        await workspace.open('atom-github://item');
        await workspace.open('atom-github://nonmatching');

        sub = watchWorkspaceItem(workspace, 'atom-github://item', component, 'someKey', {active: true});
        assert.isFalse(component.state.someKey);
      });

      it('is true when the pane is open and active in the workspace', async function() {
        await workspace.open('atom-github://nonmatching');
        await workspace.open('atom-github://item');

        sub = watchWorkspaceItem(workspace, 'atom-github://item', component, 'someKey', {active: true});
        assert.isTrue(component.state.someKey);
      });

      it('is true when the pane is open and active in any pane', async function() {
        await workspace.open('atom-github://item', {location: 'right'});
        await workspace.open('atom-github://nonmatching');

        assert.strictEqual(workspace.getRightDock().getActivePaneItem().getURI(), 'atom-github://item');
        assert.strictEqual(workspace.getActivePaneItem(), 'atom-github://nonmatching');

        sub = watchWorkspaceItem(workspace, 'atom-github://item', component, 'someKey', {active: true});
        assert.isTrue(component.state.someKey);
      });
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

    describe('{active: true}', function() {
      //
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

  describe('setPattern', function() {
    it('immediately updates the state based on the new pattern', async function() {
      sub = watchWorkspaceItem(workspace, 'atom-github://item0/{pattern}', component, 'theKey');
      assert.isFalse(component.state.theKey);

      await workspace.open('atom-github://item1/match');
      assert.isFalse(component.setState.called);

      await sub.setPattern('atom-github://item1/{pattern}');
      assert.isFalse(component.state.theKey);
      assert.isTrue(component.setState.calledWith({theKey: true}));
    });

    it('uses the new pattern to keep state up to date', async function() {
      sub = watchWorkspaceItem(workspace, 'atom-github://item0/{pattern}', component, 'theKey');
      await sub.setPattern('atom-github://item1/{pattern}');

      await workspace.open('atom-github://item0/match');
      assert.isFalse(component.setState.called);

      await workspace.open('atom-github://item1/match');
      assert.isTrue(component.setState.calledWith({theKey: true}));
    });

    describe('{active: true}', function() {
      //
    });
  });
});
