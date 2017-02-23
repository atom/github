import fs from 'fs';
import path from 'path';

import React from 'react';
import until from 'test-until';
import {mount} from 'enzyme';

import {cloneRepository, buildRepository, setUpLocalAndRemoteRepositories} from '../helpers';
import StatusBarTileController from '../../lib/controllers/status-bar-tile-controller';
import BranchView from '../../lib/views/branch-view';

describe('StatusBarTileController', function() {
  let atomEnvironment;
  let workspace, workspaceElement, commandRegistry, notificationManager, tooltips;
  let component;

  beforeEach(function() {
    atomEnvironment = global.buildAtomEnvironment();
    workspace = atomEnvironment.workspace;
    commandRegistry = atomEnvironment.commands;
    notificationManager = atomEnvironment.notifications;
    tooltips = atomEnvironment.tooltips;

    workspaceElement = atomEnvironment.views.getView(workspace);

    component = (
      <StatusBarTileController
        workspace={workspace}
        commandRegistry={commandRegistry}
        notificationManager={notificationManager}
        tooltips={tooltips}
      />
    );
  });

  afterEach(function() {
    atomEnvironment.destroy();
  });

  describe('branches', function() {
    it('indicates the current branch', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      const wrapper = mount(React.cloneElement(component, {repository}));
      await wrapper.instance().refreshModelData();

      assert.equal(wrapper.find(BranchView).prop('branchName'), 'master');
    });

    function getTooltipNode(wrapper, selector) {
      const ts = tooltips.findTooltips(wrapper.find(selector).node.element);
      assert.lengthOf(ts, 1);
      ts[0].show();
      return ts[0].getTooltipElement();
    }

    describe('the branch menu', function() {
      function selectOption(tip, value) {
        const selects = Array.from(tip.getElementsByTagName('select'));
        assert.lengthOf(selects, 1);
        const select = selects[0];
        select.value = value;

        const event = new Event('change', {bubbles: true, cancelable: true});
        select.dispatchEvent(event);
      }

      describe('checking out an existing branch', function() {
        it('can check out existing branches with no conflicts', async function() {
          const workdirPath = await cloneRepository('three-files');
          const repository = await buildRepository(workdirPath);

          // create branch called 'branch'
          await repository.git.exec(['branch', 'branch']);

          const wrapper = mount(React.cloneElement(component, {repository}));
          await wrapper.instance().refreshModelData();

          const tip = getTooltipNode(wrapper, BranchView);

          const branches = Array.from(tip.getElementsByTagName('option'), e => e.innerHTML);
          assert.deepEqual(branches, ['branch', 'master']);

          assert.equal(await repository.getCurrentBranch(), 'master');
          assert.equal(tip.querySelector('select').value, 'master');

          selectOption(tip, 'branch');
          assert.equal(await repository.getCurrentBranch(), 'branch');
          assert.equal(tip.querySelector('select').value, 'branch');
          await wrapper.instance().refreshModelData();
          assert.equal(tip.querySelector('select').value, 'branch');

          selectOption(tip, 'master');
          assert.equal(await repository.getCurrentBranch(), 'master');
          assert.equal(tip.querySelector('select').value, 'master');
          await wrapper.instance().refreshModelData();
          assert.equal(tip.querySelector('select').value, 'master');
        });

        it('displays an error message if checkout fails', async function() {
          const {localRepoPath} = await setUpLocalAndRemoteRepositories('three-files');
          const repository = await buildRepository(localRepoPath);
          await repository.git.exec(['branch', 'branch']);

          // create a conflict
          fs.writeFileSync(path.join(localRepoPath, 'a.txt'), 'a change');

          await repository.git.exec(['commit', '-a', '-m', 'change on master']);
          await repository.checkout('branch');
          fs.writeFileSync(path.join(localRepoPath, 'a.txt'), 'a change that conflicts');

          const controller = new StatusBarTileController({workspace, repository, commandRegistry, notificationManager});
          await controller.getLastModelDataRefreshPromise();
          await etch.getScheduler().getNextUpdatePromise();

          const branchMenuView = controller.branchMenuView;
          const {list} = branchMenuView.refs;

          const branches = Array.from(list.options).map(option => option.value);
          assert.equal(await repository.getCurrentBranch(), 'branch');
          assert.equal(list.selectedOptions[0].value, 'branch');

          sinon.stub(notificationManager, 'addError');

          list.selectedIndex = branches.indexOf('master');
          list.onchange();
          await etch.getScheduler().getNextUpdatePromise();
          assert.equal(await repository.getCurrentBranch(), 'branch');
          await assert.async.equal(list.selectedOptions[0].value, 'branch');
          await assert.async.isTrue(notificationManager.addError.called);
          const notificationArgs = notificationManager.addError.args[0];
          assert.equal(notificationArgs[0], 'Checkout aborted');
          assert.match(notificationArgs[1].description, /Local changes to the following would be overwritten/);
        });
      });

      describe('checking out newly created branches', function() {
        it('can check out newly created branches', async function() {
          const workdirPath = await cloneRepository('three-files');
          const repository = await buildRepository(workdirPath);

          const controller = new StatusBarTileController({workspace, repository, commandRegistry});
          await controller.getLastModelDataRefreshPromise();
          await etch.getScheduler().getNextUpdatePromise();

          const branchMenuView = controller.branchMenuView;
          const {list, newBranchButton} = branchMenuView.refs;

          const branches = Array.from(list.options).map(option => option.value);
          assert.deepEqual(branches, ['master']);
          assert.equal(await repository.getCurrentBranch(), 'master');
          assert.equal(list.selectedOptions[0].value, 'master');

          assert.isDefined(branchMenuView.refs.list);
          assert.isUndefined(branchMenuView.refs.editor);
          newBranchButton.click();
          await etch.getScheduler().getNextUpdatePromise();
          assert.isUndefined(branchMenuView.refs.list);
          assert.isDefined(branchMenuView.refs.editor);

          branchMenuView.refs.editor.setText('new-branch');
          await newBranchButton.onclick();
          repository.refresh();
          await controller.getLastModelDataRefreshPromise();
          await etch.getScheduler().getNextUpdatePromise();

          assert.isUndefined(branchMenuView.refs.editor);
          assert.isDefined(branchMenuView.refs.list);

          assert.equal(await repository.getCurrentBranch(), 'new-branch');
          assert.equal(branchMenuView.refs.list.selectedOptions[0].value, 'new-branch');
        });

        it('displays an error message if branch already exists', async function() {
          const workdirPath = await cloneRepository('three-files');
          const repository = await buildRepository(workdirPath);

          await repository.git.exec(['checkout', '-b', 'branch']);

          const controller = new StatusBarTileController({workspace, repository, commandRegistry, notificationManager});
          await controller.getLastModelDataRefreshPromise();
          await etch.getScheduler().getNextUpdatePromise();

          const branchMenuView = controller.branchMenuView;
          const {list, newBranchButton} = branchMenuView.refs;

          sinon.stub(notificationManager, 'addError');

          const branches = Array.from(branchMenuView.refs.list.options).map(option => option.value);
          assert.deepEqual(branches, ['branch', 'master']);
          assert.equal(await repository.getCurrentBranch(), 'branch');
          assert.equal(list.selectedOptions[0].value, 'branch');

          await newBranchButton.onclick();

          branchMenuView.refs.editor.setText('master');
          await newBranchButton.onclick();
          await assert.async.isTrue(notificationManager.addError.called);
          const notificationArgs = notificationManager.addError.args[0];
          assert.equal(notificationArgs[0], 'Cannot create branch');
          assert.match(notificationArgs[1].description, /already exists/);

          assert.equal(await repository.getCurrentBranch(), 'branch');
          assert.equal(branchMenuView.refs.list.selectedOptions[0].value, 'branch');
        });
      });
    });
  });

  describe('pushing and pulling', function() {
    it('indicates the ahead and behind counts and toggles visibility of the push pull menu when clicked', async function() {
      const {localRepoPath} = await setUpLocalAndRemoteRepositories();
      const repository = await buildRepository(localRepoPath);

      const controller = new StatusBarTileController({workspace, repository, commandRegistry});
      await controller.getLastModelDataRefreshPromise();
      await etch.getScheduler().getNextUpdatePromise();

      const pushPullView = controller.refs.pushPullView;
      const {aheadCount, behindCount} = pushPullView.refs;
      assert.equal(aheadCount.textContent, '');
      assert.equal(behindCount.textContent, '');

      await repository.git.exec(['reset', '--hard', 'head~2']);
      repository.refresh();
      await controller.getLastModelDataRefreshPromise();
      await etch.getScheduler().getNextUpdatePromise();
      assert.equal(aheadCount.textContent, '');
      assert.equal(behindCount.textContent, '2');

      await repository.git.commit('new local commit', {allowEmpty: true});
      repository.refresh();
      await controller.getLastModelDataRefreshPromise();
      await etch.getScheduler().getNextUpdatePromise();
      assert.equal(aheadCount.textContent, '1');
      assert.equal(behindCount.textContent, '2');

      // FIXME: Remove this guard when 1.13 is on stable.
      if (parseFloat(atom.getVersion() >= 1.13)) {
        assert.isUndefined(document.querySelectorAll('.github-PushPullMenuView')[0]);
        pushPullView.element.click();
        assert.isDefined(document.querySelectorAll('.github-PushPullMenuView')[0]);
        pushPullView.element.click();
        assert.isUndefined(document.querySelectorAll('.github-PushPullMenuView')[0]);
      }
    });

    describe('the push/pull menu', function() {
      it('disables the fetch and pull buttons when there is no remote tracking branch and displays informative message', async function() {
        const {localRepoPath} = await setUpLocalAndRemoteRepositories();
        const repository = await buildRepository(localRepoPath);
        await repository.git.exec(['checkout', '-b', 'new-branch']);

        const controller = new StatusBarTileController({workspace, repository, commandRegistry});
        await controller.getLastModelDataRefreshPromise();
        await etch.getScheduler().getNextUpdatePromise();

        const pushPullMenuView = controller.pushPullMenuView;
        const {pushButton, pullButton, fetchButton, message} = pushPullMenuView.refs;

        assert.isTrue(pullButton.disabled);
        assert.isTrue(fetchButton.disabled);
        assert.match(message.innerHTML, /No remote detected.*Pushing will set up a remote tracking branch/);

        pushButton.dispatchEvent(new MouseEvent('click'));
        await until(async fail => {
          try {
            repository.refresh();
            await controller.getLastModelDataRefreshPromise();
            await etch.getScheduler().getNextUpdatePromise();

            assert.isFalse(pullButton.disabled);
            assert.isFalse(fetchButton.disabled);
            assert.equal(message.textContent, '');
            return true;
          } catch (err) {
            return fail(err);
          }
        });
      });

      it('displays an error message if push fails and allows force pushing if meta key is pressed', async function() {
        const {localRepoPath} = await setUpLocalAndRemoteRepositories();
        const repository = await buildRepository(localRepoPath);
        await repository.git.exec(['reset', '--hard', 'head~2']);
        await repository.git.commit('another commit', {allowEmpty: true});

        const controller = new StatusBarTileController({workspace, repository, commandRegistry, notificationManager});
        await controller.getLastModelDataRefreshPromise();
        await etch.getScheduler().getNextUpdatePromise();

        const pushPullMenuView = controller.pushPullMenuView;
        const {pushButton, pullButton} = pushPullMenuView.refs;

        sinon.stub(notificationManager, 'addError');

        assert.equal(pushButton.textContent, 'Push (1)');
        assert.equal(pullButton.textContent, 'Pull (2)');

        pushButton.dispatchEvent(new MouseEvent('click'));
        await controller.getLastModelDataRefreshPromise();
        await etch.getScheduler().getNextUpdatePromise();

        await assert.async.isTrue(notificationManager.addError.called);
        const notificationArgs = notificationManager.addError.args[0];
        assert.equal(notificationArgs[0], 'Push rejected');
        assert.match(notificationArgs[1].description, /Try pulling before pushing again/);

        pushButton.dispatchEvent(new MouseEvent('click', {metaKey: true}));
        repository.refresh();
        await controller.getLastModelDataRefreshPromise();

        await assert.async.equal(pushButton.textContent, 'Push ');
        await assert.async.equal(pullButton.textContent, 'Pull ');
      });
    });

    describe('fetch and pull commands', function() {
      it('fetches when github:fetch is triggered', async function() {
        const {localRepoPath} = await setUpLocalAndRemoteRepositories('multiple-commits', {remoteAhead: true});
        const repository = await buildRepository(localRepoPath);

        const controller = new StatusBarTileController({workspace, repository, commandRegistry});
        await controller.getLastModelDataRefreshPromise();

        sinon.spy(repository, 'fetch');

        commandRegistry.dispatch(workspaceElement, 'github:fetch');

        assert.isTrue(repository.fetch.called);
      });

      it('pulls when github:pull is triggered', async function() {
        const {localRepoPath} = await setUpLocalAndRemoteRepositories('multiple-commits', {remoteAhead: true});
        const repository = await buildRepository(localRepoPath);

        const controller = new StatusBarTileController({workspace, repository, commandRegistry});
        await controller.getLastModelDataRefreshPromise();

        sinon.spy(repository, 'pull');

        commandRegistry.dispatch(workspaceElement, 'github:pull');

        assert.isTrue(repository.pull.called);
      });

      it('pushes when github:push is triggered', async function() {
        const {localRepoPath} = await setUpLocalAndRemoteRepositories();
        const repository = await buildRepository(localRepoPath);

        const controller = new StatusBarTileController({workspace, repository, commandRegistry});
        await controller.getLastModelDataRefreshPromise();

        sinon.spy(repository, 'push');

        commandRegistry.dispatch(workspaceElement, 'github:push');

        assert.isTrue(repository.push.calledWith('master', sinon.match({force: false, setUpstream: false})));
      });

      it('force pushes when github:force-push is triggered', async function() {
        const {localRepoPath} = await setUpLocalAndRemoteRepositories();
        const repository = await buildRepository(localRepoPath);

        const controller = new StatusBarTileController({workspace, repository, commandRegistry});
        await controller.getLastModelDataRefreshPromise();

        sinon.spy(repository, 'push');

        commandRegistry.dispatch(workspaceElement, 'github:force-push');

        assert.isTrue(repository.push.calledWith('master', sinon.match({force: true, setUpstream: false})));
      });
    });
  });

  describe('changed files', function() {
    it('shows the changed files count view when the repository data is loaded', async function() {
      const workdirPath = await cloneRepository('three-files');
      const repository = await buildRepository(workdirPath);

      const toggleGitPanel = sinon.spy();
      const controller = new StatusBarTileController({workspace, repository, toggleGitPanel, commandRegistry});
      await controller.getLastModelDataRefreshPromise();
      await etch.getScheduler().getNextUpdatePromise();

      const changedFilesCountView = controller.refs.changedFilesCountView;

      assert.equal(changedFilesCountView.element.textContent, '0 files');

      fs.writeFileSync(path.join(workdirPath, 'a.txt'), 'a change\n');
      fs.unlinkSync(path.join(workdirPath, 'b.txt'));
      repository.refresh();
      await repository.stageFiles(['a.txt']);
      repository.refresh();
      await controller.getLastModelDataRefreshPromise();
      await etch.getScheduler().getNextUpdatePromise();

      assert.equal(changedFilesCountView.element.textContent, '2 files');

      changedFilesCountView.element.click();
      assert(toggleGitPanel.calledOnce);
    });
  });
});
