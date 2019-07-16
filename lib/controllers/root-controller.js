import React, {useState, useEffect, Fragment} from 'react';
import fs from 'fs-extra';
import path from 'path';
import {remote} from 'electron';
import {CompositeDisposable} from 'event-kit';
import PropTypes from 'prop-types';

import StatusBar from '../atom/status-bar';
import Panel from '../atom/panel';
import PaneItem from '../atom/pane-item';
import {useAtomEnv} from '../context/atom';
import {useRepository} from '../context/workdir';
import CloneDialog from '../views/clone-dialog';
import OpenIssueishDialog from '../views/open-issueish-dialog';
import OpenCommitDialog from '../views/open-commit-dialog';
import InitDialog from '../views/init-dialog';
import CredentialDialog from '../views/credential-dialog';
import {Commands, Command} from '../atom/commands';
import ChangedFileItem from '../items/changed-file-item';
import IssueishDetailItem from '../items/issueish-detail-item';
import CommitDetailItem from '../items/commit-detail-item';
import CommitPreviewItem from '../items/commit-preview-item';
import GitTabItem from '../items/git-tab-item';
import GitHubTabItem from '../items/github-tab-item';
import ReviewsItem from '../items/reviews-item';
import CommentDecorationsContainer from '../containers/comment-decorations-container';
import StatusBarTileController from './status-bar-tile-controller';
import RepositoryConflictController from './repository-conflict-controller';
import GitCacheView from '../views/git-cache-view';
import GitTimingsView from '../views/git-timings-view';
import Conflict from '../models/conflicts/conflict';
import Switchboard from '../switchboard';
import {WorkdirContextPoolPropType} from '../prop-types';
import {destroyFilePatchPaneItems, destroyEmptyFilePatchPaneItems} from '../helpers';
import {GitError} from '../git-shell-out-strategy';
import {incrementCounter, addEvent} from '../reporter-proxy';

export default function RootController(props) {
  const atomEnv = useAtomEnv();
  const repository = useRepository();

  const [initDialogActive, setInitDialogActive] = useState(false);
  const [initDialogPath, setInitDialogPath] = useState(null);
  const [initDialogResolve, setInitDialogResolve] = useState(() => {});
  const [cloneDialogActive, setCloneDialogActive] = useState(false);
  const [cloneDialogInProgress, setCloneDialogInProgress] = useState(false);
  const [openIssueishDialogActive, setOpenIssueishDialogActive] = useState(false);
  const [openCommitDialogActive, setOpenCommitDialogActive] = useState(false);
  const [credentialDialogQuery, setCredentialDialogQuery] = useState(null);

  const gitTabTracker = new TabTracker('git', {
    uri: GitTabItem.buildURI(),
    getWorkspace: () => atomEnv.workspace,
  });

  const githubTabTracker = new TabTracker('github', {
    uri: GitHubTabItem.buildURI(),
    getWorkspace: () => atomEnv.workspace,
  });

  const subs = new CompositeDisposable(
    atomEnv.commands.onDidDispatch(event => {
      if (
        event.type && event.type.startsWith('github:') &&
        event.detail && event.detail[0] && event.detail[0].contextCommand
      ) {
        addEvent('context-menu-action', {
          package: 'github',
          command: event.type,
        });
      }
    }),
  );

  useEffect(() => () => subs.dispose(), []);

  useEffect(() => {
    (async function() {
      if (props.startOpen) {
        await Promise.all([
          gitTabTracker.ensureRendered(false),
          githubTabTracker.ensureRendered(false),
        ]);
      }

      if (props.startRevealed) {
        const docks = new Set(
          [GitTabItem.buildURI(), GitHubTabItem.buildURI()]
            .map(uri => atomEnv.workspace.paneContainerForURI(uri))
            .filter(container => container && (typeof container.show) === 'function'),
        );

        for (const dock of docks) {
          dock.show();
        }
      }
    })();
  }, []);

  useEffect(() => {
    subs.add(props.repository.onPullError(gitTabTracker.ensureVisible));
  }, [props.repository]);

  async function installExtension(id) {
    const devToolsName = 'electron-devtools-installer';
    const devTools = require(devToolsName);

    const crossUnzipName = 'cross-unzip';
    const unzip = require(crossUnzipName);

    const url =
      'https://clients2.google.com/service/update2/crx?' +
      `response=redirect&x=id%3D${id}%26uc&prodversion=32`;
    const extensionFolder = path.resolve(remote.app.getPath('userData'), `extensions/${id}`);
    const extensionFile = `${extensionFolder}.crx`;
    await fs.ensureDir(path.dirname(extensionFile));
    const response = await fetch(url, {method: 'GET'});
    const body = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(extensionFile, body);

    await new Promise((resolve, reject) => {
      unzip(extensionFile, extensionFolder, async err => {
        if (err && !await fs.exists(path.join(extensionFolder, 'manifest.json'))) {
          reject(err);
        }

        resolve();
      });
    });

    await fs.ensureDir(extensionFolder, 0o755);
    await devTools.default(id);
  }

  async function installReactDevTools() {
    // Prevent electron-link from attempting to descend into electron-devtools-installer, which is not available
    // when we're bundled in Atom.
    const devToolsName = 'electron-devtools-installer';
    const devTools = require(devToolsName);

    await Promise.all([
      installExtension(devTools.REACT_DEVELOPER_TOOLS.id),
      // relay developer tools extension id
      installExtension('ncedobpgnmkhcmnnkcimnobpfepidadl'),
    ]);

    atomEnv.notifications.addSuccess('🌈 Reload your window to start using the React and Relay dev tools!');
  }

  function onConsumeStatusBar(statusBar) {
    if (statusBar.disableGitInfoTile) {
      statusBar.disableGitInfoTile();
    }
  }

  function clearGitHubToken() {
    return props.loginModel.removeToken('https://api.github.com');
  }

  function showInitDialog() {
    if (initDialogActive) {
      return null;
    }

    if (!initDialogPath) {
      setInitDialogPath(repository.getWorkingDirectoryPath());
    }

    return new Promise(resolve => {
      setInitDialogResolve(resolve);
      setInitDialogActive(true);
    });
  }

  async function acceptInit(projectPath) {
    try {
      await props.createRepositoryForProjectPath(projectPath);
      initDialogResolve(projectPath);
    } catch (e) {
      atomEnv.notifications.addError(
        `Unable to initialize git repository in ${projectPath}`,
        {detail: e.stdErr, dismissable: true},
      );
    } finally {
      setInitDialogActive(false);
      setInitDialogPath(null);
      setInitDialogResolve(() => {});
    }
  }

  function cancelInit() {
    initDialogResolve();
    setInitDialogActive(false);
    setInitDialogPath(null);
    setInitDialogResolve(() => {});
  }

  async function acceptClone(remoteURL, projectPath) {
    setCloneDialogInProgress(true);
    try {
      await props.cloneRepositoryForProjectPath(remoteURL, projectPath);
      addEvent('clone-repo', {package: 'github'});
    } catch (e) {
      atomEnv.notifications.addError(
        `Unable to clone ${remoteURL}`,
        {detail: e.stdErr, dismissable: true},
      );
    } finally {
      setCloneDialogActive(false);
      setCloneDialogInProgress(false);
    }
  }

  function cancelClone() {
    setCloneDialogActive(false);
    setCloneDialogInProgress(false);
  }

  function acceptOpenIssueish({repoOwner, repoName, issueishNumber}) {
    const uri = IssueishDetailItem.buildURI({
      host: 'github.com',
      owner: repoOwner,
      repo: repoName,
      number: issueishNumber,
    });
    setOpenIssueishDialogActive(false);
    atomEnv.workspace.open(uri).then(() => {
      addEvent('open-issueish-in-pane', {package: 'github', from: 'dialog'});
    });
  }

  function acceptOpenCommit({ref}) {
    setOpenCommitDialogActive(false);

    const workdir = repository.getWorkingDirectoryPath();
    const uri = CommitDetailItem.buildURI(workdir, ref);
    atomEnv.workspace.open(uri).then(() => {
      addEvent('open-commit-in-pane', {package: 'github', from: OpenCommitDialog.name});
    });
  }

  function toggleCommitPreviewItem() {
    const workdir = repository.getWorkingDirectoryPath();
    return atomEnv.workspace.toggle(CommitPreviewItem.buildURI(workdir));
  }

  async function isValidCommit(ref) {
    try {
      await repository.getCommit(ref);
      return true;
    } catch (error) {
      if (error instanceof GitError && error.code === 128) {
        return false;
      } else {
        throw error;
      }
    }
  }

  function surfaceFromFileAtPath(filePath, stagingStatus) {
    const gitTab = gitTabTracker.getComponent();
    return gitTab && gitTab.focusAndSelectStagingItem(filePath, stagingStatus);
  }

  function surfaceToCommitPreviewButton() {
    const gitTab = gitTabTracker.getComponent();
    return gitTab && gitTab.focusAndSelectCommitPreviewButton();
  }

  function surfaceToRecentCommit() {
    const gitTab = gitTabTracker.getComponent();
    return gitTab && gitTab.focusAndSelectRecentCommit();
  }

  function quietlySelectItem(filePath, stagingStatus) {
    const gitTab = gitTabTracker.getComponent();
    return gitTab && gitTab.quietlySelectItem(filePath, stagingStatus);
  }

  function openFiles(filePaths, r = repository) {
    return Promise.all(filePaths.map(filePath => {
      const absolutePath = path.join(r.getWorkingDirectoryPath(), filePath);
      return atomEnv.workspace.open(absolutePath, {pending: filePaths.length === 1});
    }));
  }

  function getUnsavedFiles(filePaths, workdirPath) {
    const isModifiedByPath = new Map();
    atomEnv.workspace.getTextEditors().forEach(editor => {
      isModifiedByPath.set(editor.getPath(), editor.isModified());
    });
    return filePaths.filter(filePath => {
      const absFilePath = path.join(workdirPath, filePath);
      return isModifiedByPath.get(absFilePath);
    });
  }

  function ensureNoUnsavedFiles(filePaths, message, workdirPath = repository.getWorkingDirectoryPath()) {
    const unsavedFiles = getUnsavedFiles(filePaths, workdirPath).map(filePath => `\`${filePath}\``).join('<br>');
    if (unsavedFiles.length) {
      atomEnv.notifications.addError(
        message,
        {
          description: `You have unsaved changes in:<br>${unsavedFiles}.`,
          dismissable: true,
        },
      );
      return false;
    } else {
      return true;
    }
  }

  async function discardWorkDirChangesForPaths(filePaths) {
    const destructiveAction = () => {
      return repository.discardWorkDirChangesForPaths(filePaths);
    };
    return await repository.storeBeforeAndAfterBlobs(
      filePaths,
      () => ensureNoUnsavedFiles(filePaths, 'Cannot discard changes in selected files.'),
      destructiveAction,
    );
  }

  async function discardLines(multiFilePatch, lines, r = repository) {
    // (kuychaco) For now we only support discarding rows for MultiFilePatches that contain a single file patch
    // The only way to access this method from the UI is to be in a ChangedFileItem, which only has a single file patch
    if (multiFilePatch.getFilePatches().length !== 1) {
      return Promise.resolve(null);
    }

    const filePath = multiFilePatch.getFilePatches()[0].getPath();
    const destructiveAction = async () => {
      const discardFilePatch = multiFilePatch.getUnstagePatchForLines(lines);
      await r.applyPatchToWorkdir(discardFilePatch);
    };
    return await r.storeBeforeAndAfterBlobs(
      [filePath],
      () => ensureNoUnsavedFiles([filePath], 'Cannot discard lines.', r.getWorkingDirectoryPath()),
      destructiveAction,
      filePath,
    );
  }

  function getFilePathsForLastDiscard(partialDiscardFilePath = null) {
    let lastSnapshots = repository.getLastHistorySnapshots(partialDiscardFilePath);
    if (partialDiscardFilePath) {
      lastSnapshots = lastSnapshots ? [lastSnapshots] : [];
    }
    return lastSnapshots.map(snapshot => snapshot.filePath);
  }

  async function undoLastDiscard(partialDiscardFilePath = null, r = repository) {
    const filePaths = getFilePathsForLastDiscard(partialDiscardFilePath);
    try {
      const results = await r.restoreLastDiscardInTempFiles(
        () => ensureNoUnsavedFiles(filePaths, 'Cannot undo last discard.'),
        partialDiscardFilePath,
      );
      if (results.length === 0) { return; }
      await proceedOrPromptBasedOnResults(results, partialDiscardFilePath);
    } catch (e) {
      if (e instanceof GitError && e.stdErr.match(/fatal: Not a valid object name/)) {
        cleanUpHistoryForFilePaths(filePaths, partialDiscardFilePath);
      } else {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }
  }

  async function proceedOrPromptBasedOnResults(results, partialDiscardFilePath = null) {
    const conflicts = results.filter(({conflict}) => conflict);
    if (conflicts.length === 0) {
      await proceedWithLastDiscardUndo(results, partialDiscardFilePath);
    } else {
      await promptAboutConflicts(results, conflicts, partialDiscardFilePath);
    }
  }

  async function promptAboutConflicts(results, conflicts, partialDiscardFilePath = null) {
    const conflictedFiles = conflicts.map(({filePath}) => `\t${filePath}`).join('\n');
    const choice = atomEnv.confirm({
      message: 'Undoing will result in conflicts...',
      detailedMessage: `for the following files:\n${conflictedFiles}\n` +
        'Would you like to apply the changes with merge conflict markers, ' +
        'or open the text with merge conflict markers in a new file?',
      buttons: ['Merge with conflict markers', 'Open in new file', 'Cancel'],
    });
    if (choice === 0) {
      await proceedWithLastDiscardUndo(results, partialDiscardFilePath);
    } else if (choice === 1) {
      await openConflictsInNewEditors(conflicts.map(({resultPath}) => resultPath));
    }
  }

  function cleanUpHistoryForFilePaths(filePaths, partialDiscardFilePath = null) {
    repository.clearDiscardHistory(partialDiscardFilePath);
    const filePathsStr = filePaths.map(filePath => `\`${filePath}\``).join('<br>');
    atomEnv.notifications.addError(
      'Discard history has expired.',
      {
        description: `Cannot undo discard for<br>${filePathsStr}<br>Stale discard history has been deleted.`,
        dismissable: true,
      },
    );
  }

  async function proceedWithLastDiscardUndo(results, partialDiscardFilePath = null) {
    const promises = results.map(async result => {
      const {filePath, resultPath, deleted, conflict, theirsSha, commonBaseSha, currentSha} = result;
      const absFilePath = path.join(repository.getWorkingDirectoryPath(), filePath);
      if (deleted && resultPath === null) {
        await fs.remove(absFilePath);
      } else {
        await fs.copy(resultPath, absFilePath);
      }
      if (conflict) {
        await repository.writeMergeConflictToIndex(filePath, commonBaseSha, currentSha, theirsSha);
      }
    });
    await Promise.all(promises);
    await repository.popDiscardHistory(partialDiscardFilePath);
  }

  async function openConflictsInNewEditors(resultPaths) {
    const editorPromises = resultPaths.map(resultPath => {
      return atomEnv.workspace.open(resultPath);
    });
    return await Promise.all(editorPromises);
  }

  async function viewChangesForCurrentFile(stagingStatus) {
    const editor = atomEnv.workspace.getActiveTextEditor();
    if (!editor.getPath()) { return; }

    const absFilePath = await fs.realpath(editor.getPath());
    const repoPath = repository.getWorkingDirectoryPath();
    if (repoPath === null) {
      const [projectPath] = atomEnv.project.relativizePath(editor.getPath());
      const notification = atomEnv.notifications.addInfo(
        "Hmm, there's nothing to compare this file to",
        {
          description: 'You can create a Git repository to track changes to the files in your project.',
          dismissable: true,
          buttons: [{
            className: 'btn btn-primary',
            text: 'Create a repository now',
            onDidClick: async () => {
              notification.dismiss();
              const createdPath = await acceptInit(projectPath);
              // If the user confirmed repository creation for this project path,
              // retry the operation that got them here in the first place
              if (createdPath === projectPath) { viewChangesForCurrentFile(stagingStatus); }
            },
          }],
        },
      );
      return;
    }
    if (absFilePath.startsWith(repoPath)) {
      const filePath = absFilePath.slice(repoPath.length + 1);
      quietlySelectItem(filePath, stagingStatus);
      const splitDirection = atomEnv.config.get('github.viewChangesForCurrentFileDiffPaneSplitDirection');
      const pane = atomEnv.workspace.getActivePane();
      if (splitDirection === 'right') {
        pane.splitRight();
      } else if (splitDirection === 'down') {
        pane.splitDown();
      }
      const lineNum = editor.getCursorBufferPosition().row + 1;
      const item = await atomEnv.workspace.open(
        ChangedFileItem.buildURI(filePath, repoPath, stagingStatus),
        {pending: true, activatePane: true, activateItem: true},
      );
      await item.getRealItemPromise();
      await item.getFilePatchLoadedPromise();
      item.goToDiffLine(lineNum);
      item.focus();
    } else {
      throw new Error(`${absFilePath} does not belong to repo ${repoPath}`);
    }
  }

  function viewUnstagedChangesForCurrentFile() {
    return viewChangesForCurrentFile('unstaged');
  }

  function viewStagedChangesForCurrentFile() {
    return viewChangesForCurrentFile('staged');
  }

  function doDestroyFilePatchPaneItems() {
    destroyFilePatchPaneItems({onlyStaged: false}, atomEnv.workspace);
  }

  function doDestroyEmptyFilePatchPaneItems() {
    destroyEmptyFilePatchPaneItems(atomEnv.workspace);
  }

  function reportRelayError(friendlyMessage, err) {
    const opts = {dismissable: true};

    if (err.network) {
      // Offline
      opts.icon = 'alignment-unalign';
      opts.description = "It looks like you're offline right now.";
    } else if (err.responseText) {
      // Transient error like a 500 from the API
      opts.description = 'The GitHub API reported a problem.';
      opts.detail = err.responseText;
    } else if (err.errors) {
      // GraphQL errors
      opts.detail = err.errors.map(e => e.message).join('\n');
    } else {
      opts.detail = err.stack;
    }

    atomEnv.notifications.addError(friendlyMessage, opts);
  }

  /*
   * Asynchronously count the conflict markers present in a file specified by full path.
   */
  function refreshResolutionProgress(fullPath) {
    const readStream = fs.createReadStream(fullPath, {encoding: 'utf8'});
    return new Promise(resolve => {
      Conflict.countFromStream(readStream).then(count => {
        props.resolutionProgress.reportMarkerCount(fullPath, count);
      });
    });
  }

  function renderCommands() {
    return (
      <Commands target="atom-workspace">
        {atomEnv.devMode && <Command command="github:install-react-dev-tools" callback={installReactDevTools} />}
        <Command command="github:toggle-commit-preview" callback={toggleCommitPreviewItem} />
        <Command command="github:logout" callback={clearGitHubToken} />
        <Command
          command="github:show-waterfall-diagnostics"
          callback={() => atomEnv.workspace.open(GitTimingsView.buildURI())}
        />
        <Command
          command="github:show-cache-diagnostics"
          callback={() => atomEnv.workspace.open(GitCacheView.buildURI())}
        />
        <Command command="github:open-issue-or-pull-request" callback={() => setOpenIssueishDialogActive(true)} />
        <Command command="github:toggle-git-tab" callback={gitTabTracker.toggle} />
        <Command command="github:toggle-git-tab-focus" callback={gitTabTracker.toggleFocus} />
        <Command command="github:toggle-github-tab" callback={githubTabTracker.toggle} />
        <Command command="github:toggle-github-tab-focus" callback={githubTabTracker.toggleFocus} />
        <Command command="github:clone" callback={() => setCloneDialogActive(true)} />
        <Command command="github:open-commit" callback={() => setOpenCommitDialogActive(true)} />
        <Command command="github:view-unstaged-changes-for-current-file" callback={viewUnstagedChangesForCurrentFile} />
        <Command command="github:view-staged-changes-for-current-file" callback={viewStagedChangesForCurrentFile} />
        <Command command="github:close-all-diff-views" callback={doDestroyFilePatchPaneItems} />
        <Command command="github:close-empty-diff-views" callback={doDestroyEmptyFilePatchPaneItems} />
      </Commands>
    );
  }

  function renderStatusBar() {
    return (
      <StatusBar
        statusBar={props.statusBar}
        onConsumeStatusBar={onConsumeStatusBar}
        className="github-StatusBarTileController">
        <StatusBarTileController
          toggleGitTab={gitTabTracker.toggle}
          toggleGithubTab={githubTabTracker.toggle}
        />
      </StatusBar>
    );
  }

  function renderPaneItems() {
    return (
      <Fragment>
        <PaneItem workspace={atomEnv.workspace} uriPattern={GitTabItem.uriPattern} className="github-Git-root">
          {({itemHolder}) => (
            <GitTabItem
              ref={itemHolder.setter}
              workspace={atomEnv.workspace}
              commandRegistry={atomEnv.commands}
              notificationManager={atomEnv.notifications}
              tooltips={atomEnv.tooltips}
              grammars={atomEnv.grammars}
              project={atomEnv.project}
              confirm={atomEnv.confirm.bind(atomEnv)}
              config={atomEnv.config}
              repository={repository}
              loginModel={props.loginModel}
              initializeRepo={showInitDialog}
              resolutionProgress={props.resolutionProgress}
              ensureGitTab={gitTabTracker.ensureVisible}
              openFiles={openFiles}
              discardWorkDirChangesForPaths={discardWorkDirChangesForPaths}
              undoLastDiscard={undoLastDiscard}
              refreshResolutionProgress={refreshResolutionProgress}
            />
          )}
        </PaneItem>
        <PaneItem
          workspace={atomEnv.workspace}
          uriPattern={GitHubTabItem.uriPattern}
          className="github-GitHub-root">
          {({itemHolder}) => (
            <GitHubTabItem
              ref={itemHolder.setter}
              repository={repository}
              loginModel={props.loginModel}
              workspace={atomEnv.workspace}
            />
          )}
        </PaneItem>
        <PaneItem
          workspace={atomEnv.workspace}
          uriPattern={ChangedFileItem.uriPattern}>
          {({itemHolder, params}) => (
            <ChangedFileItem
              ref={itemHolder.setter}

              workdirContextPool={props.workdirContextPool}
              relPath={path.join(...params.relPath)}
              workingDirectory={params.workingDirectory}
              stagingStatus={params.stagingStatus}

              tooltips={atomEnv.tooltips}
              commands={atomEnv.commandRegistry}
              keymaps={atomEnv.keymaps}
              workspace={atomEnv.workspace}
              config={atomEnv.config}

              discardLines={discardLines}
              undoLastDiscard={undoLastDiscard}
              surfaceFileAtPath={surfaceFromFileAtPath}
            />
          )}
        </PaneItem>
        <PaneItem
          workspace={atomEnv.workspace}
          uriPattern={CommitPreviewItem.uriPattern}
          className="github-CommitPreview-root">
          {({itemHolder, params}) => (
            <CommitPreviewItem
              ref={itemHolder.setter}

              workdirContextPool={props.workdirContextPool}
              workingDirectory={params.workingDirectory}
              workspace={atomEnv.workspace}
              commands={atomEnv.commandRegistry}
              keymaps={atomEnv.keymaps}
              tooltips={atomEnv.tooltips}
              config={atomEnv.config}

              discardLines={discardLines}
              undoLastDiscard={undoLastDiscard}
              surfaceToCommitPreviewButton={surfaceToCommitPreviewButton}
            />
          )}
        </PaneItem>
        <PaneItem
          workspace={atomEnv.workspace}
          uriPattern={CommitDetailItem.uriPattern}
          className="github-CommitDetail-root">
          {({itemHolder, params}) => (
            <CommitDetailItem
              ref={itemHolder.setter}

              workdirContextPool={props.workdirContextPool}
              workingDirectory={params.workingDirectory}
              workspace={atomEnv.workspace}
              commands={atomEnv.commandRegistry}
              keymaps={atomEnv.keymaps}
              tooltips={atomEnv.tooltips}
              config={atomEnv.config}

              sha={params.sha}
              surfaceCommit={surfaceToRecentCommit}
            />
          )}
        </PaneItem>
        <PaneItem workspace={atomEnv.workspace} uriPattern={IssueishDetailItem.uriPattern}>
          {({itemHolder, params, deserialized}) => (
            <IssueishDetailItem
              ref={itemHolder.setter}

              host={params.host}
              owner={params.owner}
              repo={params.repo}
              issueishNumber={parseInt(params.issueishNumber, 10)}

              workingDirectory={params.workingDirectory}
              workdirContextPool={props.workdirContextPool}
              loginModel={props.loginModel}
              initSelectedTab={deserialized.initSelectedTab}

              workspace={atomEnv.workspace}
              commands={atomEnv.commandRegistry}
              keymaps={atomEnv.keymaps}
              tooltips={atomEnv.tooltips}
              config={atomEnv.config}

              reportRelayError={reportRelayError}
            />
          )}
        </PaneItem>
        <PaneItem workspace={atomEnv.workspace} uriPattern={ReviewsItem.uriPattern}>
          {({itemHolder, params}) => (
            <ReviewsItem
              ref={itemHolder.setter}

              host={params.host}
              owner={params.owner}
              repo={params.repo}
              number={parseInt(params.number, 10)}

              workdir={params.workdir}
              workdirContextPool={props.workdirContextPool}
              loginModel={props.loginModel}
              workspace={atomEnv.workspace}
              tooltips={atomEnv.tooltips}
              config={atomEnv.config}
              commands={atomEnv.commands}
              confirm={atomEnv.confirm.bind(atomEnv)}
              reportRelayError={reportRelayError}
            />
          )}
        </PaneItem>
        <PaneItem workspace={atomEnv.workspace} uriPattern={GitTimingsView.uriPattern}>
          {({itemHolder}) => <GitTimingsView ref={itemHolder.setter} />}
        </PaneItem>
        <PaneItem workspace={atomEnv.workspace} uriPattern={GitCacheView.uriPattern}>
          {({itemHolder}) => <GitCacheView ref={itemHolder.setter} repository={repository} />}
        </PaneItem>
      </Fragment>
    );
  }

  function renderInitDialog() {
    if (!initDialogActive) {
      return null;
    }

    return (
      <Panel workspace={atomEnv.workspace} location="modal">
        <InitDialog initPath={initDialogPath} didAccept={acceptInit} didCancel={cancelInit} />
      </Panel>
    );
  }

  function renderCloneDialog() {
    if (!cloneDialogActive) {
      return null;
    }

    return (
      <Panel workspace={atomEnv.workspace} location="modal">
        <CloneDialog
          didAccept={acceptClone}
          didCancel={cancelClone}
          inProgress={cloneDialogInProgress}
        />
      </Panel>
    );
  }

  function renderOpenIssueishDialog() {
    if (!openIssueishDialogActive) {
      return null;
    }

    return (
      <Panel workspace={atomEnv.workspace} location="modal">
        <OpenIssueishDialog
          didAccept={acceptOpenIssueish}
          didCancel={() => setOpenIssueishDialogActive(false)}
        />
      </Panel>
    );
  }

  function renderOpenCommitDialog() {
    if (!openCommitDialogActive) {
      return null;
    }

    return (
      <Panel workspace={atomEnv.workspace} location="modal">
        <OpenCommitDialog
          didAccept={acceptOpenCommit}
          didCancel={() => setOpenCommitDialogActive(false)}
          isValidEntry={isValidCommit}
        />
      </Panel>
    );
  }

  function renderCredentialDialog() {
    if (credentialDialogQuery === null) {
      return null;
    }

    return (
      <Panel workspace={atomEnv.workspace} location="modal">
        <CredentialDialog {...credentialDialogQuery} />
      </Panel>
    );
  }

  function renderDialogs() {
    return (
      <Fragment>
        {renderInitDialog()}
        {renderCloneDialog()}
        {renderCredentialDialog()}
        {renderOpenIssueishDialog()}
        {renderOpenCommitDialog()}
      </Fragment>
    );
  }

  function renderConflictResolver() {
    return (
      <RepositoryConflictController
        workspace={atomEnv.workspace}
        commandRegistry={atomEnv.commands}
        config={atomEnv.config}
        repository={repository}
        resolutionProgress={props.resolutionProgress}
        refreshResolutionProgress={refreshResolutionProgress}
      />
    );
  }

  function renderCommentDecorations() {
    return (
      <CommentDecorationsContainer
        workspace={atomEnv.workspace}
        commands={atomEnv.commands}
        localRepository={repository}
        loginModel={props.loginModel}
        reportRelayError={reportRelayError}
      />
    );
  }

  return (
    <Fragment>
      {renderCommands()}
      {renderStatusBar()}
      {renderPaneItems()}
      {renderDialogs()}
      {renderConflictResolver()}
      {renderCommentDecorations()}
    </Fragment>
  );
}

RootController.propTypes = {
  loginModel: PropTypes.object.isRequired,
  createRepositoryForProjectPath: PropTypes.func,
  cloneRepositoryForProjectPath: PropTypes.func,
  workdirContextPool: WorkdirContextPoolPropType.isRequired,
  repository: PropTypes.object.isRequired,
  resolutionProgress: PropTypes.object.isRequired,
  statusBar: PropTypes.object,
  switchboard: PropTypes.instanceOf(Switchboard),
  startOpen: PropTypes.bool,
  startRevealed: PropTypes.bool,
  pipelineManager: PropTypes.object,
};

class TabTracker {
  constructor(name, {getWorkspace, uri}) {
    this.name = name;
    this.getWorkspace = getWorkspace;
    this.uri = uri;
  }

  toggle = async () => {
    const focusToRestore = document.activeElement;
    let shouldRestoreFocus = false;

    // Rendered => the dock item is being rendered, whether or not the dock is visible or the item
    //   is visible within its dock.
    // Visible => the item is active and the dock item is active within its dock.
    const wasRendered = this.isRendered();
    const wasVisible = this.isVisible();

    if (!wasRendered || !wasVisible) {
      // Not rendered, or rendered but not an active item in a visible dock.
      await this.reveal();
      shouldRestoreFocus = true;
    } else {
      // Rendered and an active item within a visible dock.
      await this.hide();
      shouldRestoreFocus = false;
    }

    if (shouldRestoreFocus) {
      process.nextTick(() => focusToRestore.focus());
    }
  }

  toggleFocus = async () => {
    const hadFocus = this.hasFocus();
    await this.ensureVisible();

    if (hadFocus) {
      let workspace = this.getWorkspace();
      if (workspace.getCenter) {
        workspace = workspace.getCenter();
      }
      workspace.getActivePane().activate();
    } else {
      this.focus();
    }
  }

  ensureVisible = async () => {
    if (!this.isVisible()) {
      await this.reveal();
      return true;
    }
    return false;
  }

  ensureRendered() {
    return this.getWorkspace().open(this.uri, {searchAllPanes: true, activateItem: false, activatePane: false});
  }

  reveal() {
    incrementCounter(`${this.name}-tab-open`);
    return this.getWorkspace().open(this.uri, {searchAllPanes: true, activateItem: true, activatePane: true});
  }

  hide() {
    incrementCounter(`${this.name}-tab-close`);
    return this.getWorkspace().hide(this.uri);
  }

  focus() {
    this.getComponent().restoreFocus();
  }

  getItem() {
    const pane = this.getWorkspace().paneForURI(this.uri);
    if (!pane) {
      return null;
    }

    const paneItem = pane.itemForURI(this.uri);
    if (!paneItem) {
      return null;
    }

    return paneItem;
  }

  getComponent() {
    const paneItem = this.getItem();
    if (!paneItem) {
      return null;
    }
    if (((typeof paneItem.getRealItem) !== 'function')) {
      return null;
    }

    return paneItem.getRealItem();
  }

  getDOMElement() {
    const paneItem = this.getItem();
    if (!paneItem) {
      return null;
    }
    if (((typeof paneItem.getElement) !== 'function')) {
      return null;
    }

    return paneItem.getElement();
  }

  isRendered() {
    return !!this.getWorkspace().paneForURI(this.uri);
  }

  isVisible() {
    const workspace = this.getWorkspace();
    return workspace.getPaneContainers()
      .filter(container => container === workspace.getCenter() || container.isVisible())
      .some(container => container.getPanes().some(pane => {
        const item = pane.getActiveItem();
        return item && item.getURI && item.getURI() === this.uri;
      }));
  }

  hasFocus() {
    const root = this.getDOMElement();
    return root && root.contains(document.activeElement);
  }
}
