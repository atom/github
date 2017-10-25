import {getActionPipelineManager} from './action-pipeline';
import {GitError} from './git-shell-out-strategy';

export default function(controller, {confirm, notificationManager}) {
  const pipelineManager = getActionPipelineManager();
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
    repository.setOperationProgressState('push', true);
    await next();
    repository.setOperationProgressState('push', false);
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
        console.error(error);
        notificationManager.addError('Unable to push', {
          description: `<pre>${error.stdErr}</pre>`,
          dismissable: true,
        });
      }
      return error;
    }
  });

  const pullPipeline = pipelineManager.getPipeline(pipelineManager.actionKeys.PULL);
  pullPipeline.addMiddleware('set-pull-in-progress', async (next, repository, branchName) => {
    repository.setOperationProgressState('pull', true);
    await next();
    repository.setOperationProgressState('pull', false);
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
        controller.gitTabTracker.ensureVisible();
        notificationManager.addInfo('Merge conflicts', {
          description: `Your local changes conflicted with changes made on the remote branch. Resolve the conflicts
            with the Git panel and commit to continue.`,
          dismissable: true,
        });
      } else {
        console.error(error);
        notificationManager.addError('Unable to pull', {
          description: `<pre>${error.stdErr}</pre>`,
          dismissable: true,
        });
      }
      return error;
    }
  });

  const fetchPipeline = pipelineManager.getPipeline(pipelineManager.actionKeys.FETCH);
  fetchPipeline.addMiddleware('set-fetch-in-progress', async (next, repository) => {
    repository.setOperationProgressState('fetch', true);
    await next();
    repository.setOperationProgressState('fetch', false);
  });
  fetchPipeline.addMiddleware('failed-to-fetch-error', async (next, repository) => {
    try {
      const result = await next();
      return result;
    } catch (error) {
      if (!(error instanceof GitError)) { throw error; }
      console.error(error);
      notificationManager.addError('Unable to fetch', {
        description: `<pre>${error.stdErr}</pre>`,
        dismissable: true,
      });
      return error;
    }
  });

  const checkoutPipeline = pipelineManager.getPipeline(pipelineManager.actionKeys.CHECKOUT);
  checkoutPipeline.addMiddleware('set-checkout-in-progress', async (next, repository, branchName) => {
    repository.setOperationProgressState('checkout', branchName);
    await next();
    repository.setOperationProgressState('checkout', false);
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
      } else {
        console.error(error);
      }
      notificationManager.addError(message, {description, dismissable: true});
      return error;
    }
  });
}
