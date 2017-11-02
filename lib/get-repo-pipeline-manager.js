import ActionPipelineManager from './action-pipeline';
import {GitError} from './git-shell-out-strategy';
import {deleteFileOrFolder, getCommitMessagePath, getCommitMessageEditors, destroyFilePatchPaneItems} from './helpers';

export default function({confirm, notificationManager, workspace}) {
  const pipelineManager = new ActionPipelineManager({
    actionNames: ['PUSH', 'PULL', 'FETCH', 'COMMIT', 'CHECKOUT'],
  });

  const pushPipeline = pipelineManager.getPipeline(pipelineManager.actionKeys.PUSH);
  pushPipeline.addMiddleware('confirm-force-push', async (next, repository, branchName, options) => {
    if (options.force) {
      const choice = confirm({
        message: 'Are you sure you want to force push?',
        detailedMessage: 'This operation could result in losing data on the remote.',
        buttons: ['Force Push', 'Cancel Push'],
      });
      if (choice !== 0) { /* do nothing */ } else { await next(); }
    } else {
      await next();
    }
  });
  pushPipeline.addMiddleware('set-push-in-progress', async (next, repository, branchName, options) => {
    repository.getOperationStates().setPushInProgress(true);
    try {
      await next();
    } finally {
      repository.getOperationStates().setPushInProgress(false);
    }
  });
  pushPipeline.addMiddleware('failed-to-push-error', async (next, repository, branchName, options) => {
    try {
      const result = await next();
      return result;
    } catch (error) {
      if (!(error instanceof GitError)) { throw error; }
      if (/rejected[\s\S]*failed to push/.test(error.stdErr)) {
        notificationManager.addError('Push rejected', {
          description: 'The tip of your current branch is behind its remote counterpart.' +
            ' Try pulling before pushing again. Or, to force push, hold `cmd` or `ctrl` while clicking.',
          dismissable: true,
        });
      } else {
        notificationManager.addError('Unable to push', {
          description: `<pre>${error.stdErr}</pre>`,
          dismissable: true,
        });
      }
      throw error;
    }
  });

  const pullPipeline = pipelineManager.getPipeline(pipelineManager.actionKeys.PULL);
  pullPipeline.addMiddleware('set-pull-in-progress', async (next, repository, branchName) => {
    repository.getOperationStates().setPullInProgress(true);
    try {
      await next();
    } finally {
      repository.getOperationStates().setPullInProgress(false);
    }
  });
  pullPipeline.addMiddleware('failed-to-pull-error', async (next, repository, branchName) => {
    try {
      const result = await next();
      return result;
    } catch (error) {
      if (!(error instanceof GitError)) { throw error; }
      if (/error: Your local changes to the following files would be overwritten by merge/.test(error.stdErr)) {
        const lines = error.stdErr.split('\n');
        const files = lines.slice(3, lines.length - 3).map(l => `\`${l.trim()}\``).join('<br>');
        notificationManager.addError('Pull aborted', {
          description: 'Local changes to the following would be overwritten by merge:<br>' + files +
            '<br>Please commit your changes or stash them before you merge.',
          dismissable: true,
        });
      } else if (/Automatic merge failed; fix conflicts and then commit the result./.test(error.stdOut)) {
        repository.didMergeError();
        notificationManager.addWarning('Merge conflicts', {
          description: `Your local changes conflicted with changes made on the remote branch. Resolve the conflicts
            with the Git panel and commit to continue.`,
          dismissable: true,
        });
      } else {
        notificationManager.addError('Unable to pull', {
          description: `<pre>${error.stdErr}</pre>`,
          dismissable: true,
        });
      }
      throw error;
    }
  });

  const fetchPipeline = pipelineManager.getPipeline(pipelineManager.actionKeys.FETCH);
  fetchPipeline.addMiddleware('set-fetch-in-progress', async (next, repository) => {
    repository.getOperationStates().setFetchInProgress(true);
    try {
      await next();
    } finally {
      repository.getOperationStates().setFetchInProgress(false);
    }
  });
  fetchPipeline.addMiddleware('failed-to-fetch-error', async (next, repository) => {
    try {
      const result = await next();
      return result;
    } catch (error) {
      if (!(error instanceof GitError)) { throw error; }
      notificationManager.addError('Unable to fetch', {
        description: `<pre>${error.stdErr}</pre>`,
        dismissable: true,
      });
      throw error;
    }
  });

  const checkoutPipeline = pipelineManager.getPipeline(pipelineManager.actionKeys.CHECKOUT);
  checkoutPipeline.addMiddleware('set-checkout-in-progress', async (next, repository, branchName) => {
    repository.getOperationStates().setCheckoutInProgress(true);
    try {
      await next();
    } finally {
      repository.getOperationStates().setCheckoutInProgress(false);
    }
  });
  checkoutPipeline.addMiddleware('failed-to-checkout-error', async (next, repository, branchName, options) => {
    try {
      const result = await next();
      return result;
    } catch (error) {
      if (!(error instanceof GitError)) { throw error; }
      const message = options.createNew ? 'Cannot create branch' : 'Checkout aborted';
      let description = `<pre>${error.stdErr}</pre>`;
      if (error.stdErr.match(/local changes.*would be overwritten/)) {
        const files = error.stdErr.split(/\r?\n/).filter(l => l.startsWith('\t'))
          .map(l => `\`${l.trim()}\``).join('<br>');
        description = 'Local changes to the following would be overwritten:<br>' + files +
          '<br>Please commit your changes or stash them.';
      } else if (error.stdErr.match(/branch.*already exists/)) {
        description = `\`${branchName}\` already exists. Choose another branch name.`;
      } else if (error.stdErr.match(/error: you need to resolve your current index first/)) {
        description = 'You must first resolve merge conflicts.';
      }
      notificationManager.addError(message, {description, dismissable: true});
      throw error;
    }
  });

  const commitPipeline = pipelineManager.getPipeline(pipelineManager.actionKeys.COMMIT);
  commitPipeline.addMiddleware('confirm-commit', async (next, repository) => {
    function confirmCommit() {
      const choice = confirm({
        message: 'One or more text editors for the commit message are unsaved.',
        detailedMessage: 'Do you want to commit and close all open commit message editors?',
        buttons: ['Commit', 'Cancel'],
      });
      return choice === 0;
    }

    const commitMessageEditors = getCommitMessageEditors(repository, workspace);
    if (commitMessageEditors.length > 0) {
      if (!commitMessageEditors.some(e => e.isModified()) || confirmCommit()) {
        await next();
        commitMessageEditors.forEach(editor => editor.destroy());
      }
    } else {
      await next();
    }
  });
  commitPipeline.addMiddleware('clean-up-disk-commit-msg', async (next, repository) => {
    await next();
    try {
      await deleteFileOrFolder(getCommitMessagePath(repository));
    } catch (error) {
      // do nothing
    }
  });
  commitPipeline.addMiddleware('set-commit-in-progress', async (next, repository) => {
    repository.getOperationStates().setCommitInProgress(true);
    try {
      await next();
    } finally {
      repository.getOperationStates().setCommitInProgress(false);
    }
  });
  commitPipeline.addMiddleware('failed-to-commit-error', async (next, repository) => {
    try {
      const result = await next();
      repository.setAmending(false);
      repository.setAmendingCommitMessage('');
      repository.setRegularCommitMessage('');
      destroyFilePatchPaneItems({onlyStaged: true}, workspace);
      return result;
    } catch (error) {
      if (!(error instanceof GitError)) { throw error; }
      notificationManager.addError('Unable to commit', {
        description: `<pre>${error.stdErr}</pre>`,
        dismissable: true,
      });
      throw error;
    }
  });

  return pipelineManager;
}
