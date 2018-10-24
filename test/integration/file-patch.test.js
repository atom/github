import fs from 'fs-extra';
import path from 'path';
import until from 'test-until';

import {setup, teardown} from './helpers';
import GitShellOutStrategy from '../../lib/git-shell-out-strategy';

describe('integration: file patches', function() {
  let context, wrapper, atomEnv;
  let workspace;
  let commands, workspaceElement;
  let repoRoot, git;

  afterEach(async function() {
    await teardown(context);
  });

  async function useFixture(fixtureName) {
    context = await setup({
      initialRoots: [fixtureName],
    });

    wrapper = context.wrapper;
    atomEnv = context.atomEnv;
    commands = atomEnv.commands;
    workspace = atomEnv.workspace;

    repoRoot = atomEnv.project.getPaths()[0];
    git = new GitShellOutStrategy(repoRoot);

    workspaceElement = atomEnv.views.getView(workspace);

    // Open the git tab
    await commands.dispatch(workspaceElement, 'github:toggle-git-tab-focus');
    wrapper.update();
  }

  function repoPath(...parts) {
    return path.join(repoRoot, ...parts);
  }

  async function clickFileInGitTab(stagingStatus, relativePath) {
    let listItem = null;

    await until(() => {
      listItem = wrapper
        .update()
        .find(`.github-StagingView-${stagingStatus} .github-FilePatchListView-item`)
        .filterWhere(w => w.find('.github-FilePatchListView-path').text() === relativePath);
      return listItem.exists();
    }, `list item for path ${relativePath} (${stagingStatus}) appears`);

    listItem.simulate('mousedown', {button: 0, persist() {}});
    window.dispatchEvent(new MouseEvent('mouseup'));

    const itemSelector = `FilePatchItem[relPath="${relativePath}"][stagingStatus="${stagingStatus}"]`;
    await until(
      () => wrapper.update().find(itemSelector).find('.github-FilePatchView').exists(),
      `File patch pane item for ${relativePath} arrives and loads`,
    );
  }

  function getPatchEditor(stagingStatus, relativePath) {
    const component = wrapper
      .find(`FilePatchItem[relPath="${relativePath}"][stagingStatus="${stagingStatus}"]`)
      .find('.github-FilePatchView')
      .find('AtomTextEditor');

    if (!component.exists()) {
      return null;
    }

    return component.instance().getModel();
  }

  function patchContent(stagingStatus, relativePath, ...rows) {
    const aliases = new Map([
      ['added', 'github-FilePatchView-line--added'],
      ['deleted', 'github-FilePatchView-line--deleted'],
      ['nonewline', 'github-FilePatchView-line--nonewline'],
      ['selected', 'github-FilePatchView-line--selected'],
    ]);
    const knownClasses = new Set(aliases.values());

    let actualRowText = [];
    const differentRows = new Set();
    const actualClassesByRow = new Map();
    const missingClassesByRow = new Map();
    const unexpectedClassesByRow = new Map();

    return until(() => {
      // Determine the CSS classes applied to each screen line within the patch editor. This is gnarly, but based on
      // the logic that TextEditorComponent::queryDecorationsToRender() actually uses to determine what classes to
      // apply when rendering line elements.
      const editor = getPatchEditor(stagingStatus, relativePath);
      if (editor === null) {
        actualRowText = ['Unable to find patch item'];
        return false;
      }

      const decorationsByMarker = editor.decorationManager.decorationPropertiesByMarkerForScreenRowRange(0, Infinity);
      actualClassesByRow.clear();
      for (const [marker, decorations] of decorationsByMarker) {
        const rowNumbers = marker.getScreenRange().getRows();

        for (const decoration of decorations) {
          if (decoration.type !== 'line') {
            continue;
          }

          for (const row of rowNumbers) {
            const classes = actualClassesByRow.get(row) || [];
            classes.push(decoration.class);
            actualClassesByRow.set(row, classes);
          }
        }
      }

      actualRowText = [];
      differentRows.clear();
      missingClassesByRow.clear();
      unexpectedClassesByRow.clear();
      let match = true;

      for (let i = 0; i < Math.max(rows.length, editor.getLastScreenRow()); i++) {
        const [expectedText, ...givenClasses] = rows[i] || [''];
        const expectedClasses = givenClasses.map(givenClass => aliases.get(givenClass) || givenClass);

        const actualText = editor.lineTextForScreenRow(i);
        const actualClasses = new Set(actualClassesByRow.get(i) || []);

        actualRowText[i] = actualText;

        if (actualText !== expectedText) {
          // The patch text for this screen row differs.
          differentRows.add(i);
          match = false;
        }

        const missingClasses = expectedClasses.filter(expectedClass => !actualClasses.delete(expectedClass));
        if (missingClasses.length > 0) {
          // An expected class was not present on this screen row.
          missingClassesByRow.set(i, missingClasses);
          match = false;
        }

        const unexpectedClasses = Array.from(actualClasses).filter(remainingClass => knownClasses.has(remainingClass));
        if (unexpectedClasses.length > 0) {
          // A known class that was not expected was present on this screen row.
          unexpectedClassesByRow.set(i, unexpectedClasses);
          match = false;
        }
      }

      return match;
    }, 'waiting for the updated file patch to arrive').catch(e => {
      let diagnosticOutput = '';
      for (let i = 0; i < actualRowText.length; i++) {
        diagnosticOutput += differentRows.has(i) ? '! ' : '  ';
        diagnosticOutput += actualRowText[i];

        const annotations = [];
        annotations.push(...actualClassesByRow.get(i) || []);
        for (const missingClass of (missingClassesByRow.get(i) || [])) {
          annotations.push(`-"${missingClass}"`);
        }
        for (const unexpectedClass of (unexpectedClassesByRow.get(i) || [])) {
          annotations.push(`x"${unexpectedClass}"`);
        }
        if (annotations.length > 0) {
          diagnosticOutput += ' ';
          diagnosticOutput += annotations.join(' ');
        }

        diagnosticOutput += '\n';
      }

      // eslint-disable-next-line no-console
      console.error('Unexpected patch contents:\n', diagnosticOutput);

      throw e;
    });
  }

  describe('with an added file', function() {
    beforeEach(async function() {
      await useFixture('three-files');
      await fs.writeFile(repoPath('added-file.txt'), '0000\n0001\n0002\n0003\n0004\n0005\n', {encoding: 'utf8'});
      await clickFileInGitTab('unstaged', 'added-file.txt');
    });

    describe('unstaged', function() {
      it('may be partially staged', async function() {
        // Stage lines two and three
        getPatchEditor('unstaged', 'added-file.txt').setSelectedBufferRange([[2, 1], [3, 3]]);
        wrapper.find('.github-HunkHeaderView-stageButton').simulate('click');

        await patchContent(
          'unstaged', 'added-file.txt',
          ['0000', 'added'],
          ['0001', 'added'],
          ['0002'],
          ['0003'],
          ['0004', 'added', 'selected'],
          ['0005', 'added'],
        );

        await clickFileInGitTab('staged', 'added-file.txt');
        await patchContent(
          'staged', 'added-file.txt',
          ['0002', 'added', 'selected'],
          ['0003', 'added', 'selected'],
        );
      });

      it('may be completed staged', async function() {
        getPatchEditor('unstaged', 'added-file.txt').selectAll();
        wrapper.find('.github-HunkHeaderView-stageButton').simulate('click');

        await clickFileInGitTab('staged', 'added-file.txt');
        await patchContent(
          'staged', 'added-file.txt',
          ['0000', 'added', 'selected'],
          ['0001', 'added', 'selected'],
          ['0002', 'added', 'selected'],
          ['0003', 'added', 'selected'],
          ['0004', 'added', 'selected'],
          ['0005', 'added', 'selected'],
        );
      });

      it('may discard lines', async function() {
        getPatchEditor('unstaged', 'added-file.txt').setSelectedBufferRange([[1, 0], [3, 3]]);
        wrapper.find('.github-HunkHeaderView-discardButton').simulate('click');

        await patchContent(
          'unstaged', 'added-file.txt',
          ['0000', 'added'],
          ['0004', 'added', 'selected'],
          ['0005', 'added'],
        );

        const editor = await workspace.open(repoPath('added-file.txt'));
        assert.strictEqual(editor.getText(), '0000\n0004\n0005\n');
      });
    });

    describe('staged', function() {
      beforeEach(async function() {
        await git.stageFiles(['added-file.txt']);
        await clickFileInGitTab('staged', 'added-file.txt');
      });

      it('may be partially unstaged', async function() {
        getPatchEditor('staged', 'added-file.txt').setSelectedBufferRange([[3, 0], [4, 3]]);
        wrapper.find('.github-HunkHeaderView-stageButton').simulate('click');

        await patchContent(
          'staged', 'added-file.txt',
          ['0000', 'added'],
          ['0001', 'added'],
          ['0002', 'added'],
          ['0005', 'added', 'selected'],
        );

        await clickFileInGitTab('unstaged', 'added-file.txt');
        await patchContent(
          'unstaged', 'added-file.txt',
          ['0000'],
          ['0001'],
          ['0002'],
          ['0003', 'added', 'selected'],
          ['0004', 'added', 'selected'],
          ['0005'],
        );
      });

      it('may be completely unstaged', async function() {
        getPatchEditor('staged', 'added-file.txt').selectAll();
        wrapper.find('.github-HunkHeaderView-stageButton').simulate('click');

        await clickFileInGitTab('unstaged', 'added-file.txt');
        await patchContent(
          'unstaged', 'added-file.txt',
          ['0000', 'added', 'selected'],
          ['0001', 'added', 'selected'],
          ['0002', 'added', 'selected'],
          ['0003', 'added', 'selected'],
          ['0004', 'added', 'selected'],
          ['0005', 'added', 'selected'],
        );
      });
    });
  });

  describe('with a removed file', function() {
    beforeEach(async function() {
      await useFixture('multi-line-file');

      await fs.remove(repoPath('sample.js'));
    });

    describe('unstaged', function() {
      beforeEach(async function() {
        await clickFileInGitTab('unstaged', 'sample.js');
      });

      it('may be partially staged', async function() {
        getPatchEditor('unstaged', 'sample.js').setSelectedBufferRange([[4, 0], [7, 5]]);
        wrapper.find('.github-HunkHeaderView-stageButton').simulate('click');

        await patchContent(
          'unstaged', 'sample.js',
          ['const quicksort = function() {', 'deleted'],
          ['  const sort = function(items) {', 'deleted'],
          ['    if (items.length <= 1) { return items; }', 'deleted'],
          ['    let pivot = items.shift(), current, left = [], right = [];', 'deleted'],
          ['    return sort(left).concat(pivot).concat(sort(right));', 'deleted', 'selected'],
          ['  };', 'deleted'],
          ['', 'deleted'],
          ['  return sort(Array.apply(this, arguments));', 'deleted'],
          ['};', 'deleted'],
        );

        await clickFileInGitTab('staged', 'sample.js');

        await patchContent(
          'staged', 'sample.js',
          ['  const sort = function(items) {'],
          ['    if (items.length <= 1) { return items; }'],
          ['    let pivot = items.shift(), current, left = [], right = [];'],
          ['    while (items.length > 0) {', 'deleted', 'selected'],
          ['      current = items.shift();', 'deleted', 'selected'],
          ['      current < pivot ? left.push(current) : right.push(current);', 'deleted', 'selected'],
          ['    }', 'deleted', 'selected'],
          ['    return sort(left).concat(pivot).concat(sort(right));'],
          ['  };'],
          [''],
        );
      });

      it('may be completely staged', async function() {
        getPatchEditor('unstaged', 'sample.js').setSelectedBufferRange([[0, 0], [12, 2]]);
        wrapper.find('.github-HunkHeaderView-stageButton').simulate('click');

        await clickFileInGitTab('staged', 'sample.js');

        await patchContent(
          'staged', 'sample.js',
          ['const quicksort = function() {', 'deleted', 'selected'],
          ['  const sort = function(items) {', 'deleted', 'selected'],
          ['    if (items.length <= 1) { return items; }', 'deleted', 'selected'],
          ['    let pivot = items.shift(), current, left = [], right = [];', 'deleted', 'selected'],
          ['    while (items.length > 0) {', 'deleted', 'selected'],
          ['      current = items.shift();', 'deleted', 'selected'],
          ['      current < pivot ? left.push(current) : right.push(current);', 'deleted', 'selected'],
          ['    }', 'deleted', 'selected'],
          ['    return sort(left).concat(pivot).concat(sort(right));', 'deleted', 'selected'],
          ['  };', 'deleted', 'selected'],
          ['', 'deleted', 'selected'],
          ['  return sort(Array.apply(this, arguments));', 'deleted', 'selected'],
          ['};', 'deleted', 'selected'],
        );
      });

      it('may discard lines', async function() {
        getPatchEditor('unstaged', 'sample.js').setSelectedBufferRanges([
          [[1, 0], [2, 0]],
          [[7, 0], [8, 1]],
        ]);
        wrapper.find('.github-HunkHeaderView-discardButton').simulate('click');

        await patchContent(
          'unstaged', 'sample.js',
          ['const quicksort = function() {', 'deleted'],
          ['  const sort = function(items) {'],
          ['    if (items.length <= 1) { return items; }'],
          ['    let pivot = items.shift(), current, left = [], right = [];', 'deleted'],
          ['    while (items.length > 0) {', 'deleted'],
          ['      current = items.shift();', 'deleted'],
          ['      current < pivot ? left.push(current) : right.push(current);', 'deleted'],
          ['    }'],
          ['    return sort(left).concat(pivot).concat(sort(right));'],
          ['  };', 'deleted', 'selected'],
          ['', 'deleted'],
          ['  return sort(Array.apply(this, arguments));', 'deleted'],
          ['};', 'deleted'],
        );

        const editor = await workspace.open(repoPath('sample.js'));
        assert.strictEqual(
          editor.getText(),
          '  const sort = function(items) {\n' +
          '    if (items.length <= 1) { return items; }\n' +
          '    }\n' +
          '    return sort(left).concat(pivot).concat(sort(right));\n',
        );
      });
    });

    describe('staged', function() {
      it('may be partially unstaged');

      it('may be partially staged');
    });
  });

  describe('with a symlink that used to be a file', function() {
    describe('unstaged', function() {
      it('may stage the content deletion without the symlink creation');

      it('may stage the content deletion and the symlink creation');
    });

    describe('staged', function() {
      it('may unstage the content deletion and the symlink creation');
    });
  });

  describe('with a file that used to be a symlink', function() {
    describe('unstaged', function() {
      it('may stage the symlink deletion without the content addition');

      it('may stage the content addition and the symlink deletion');
    });

    describe('staged', function() {
      it('may unstage the content addition and the symlink creation');

      it('may unstage the content addition without the symlink creation');

      it('may unstage the symlink creation without the content addition');
    });
  });

  describe('with a modified file', function() {
    describe('unstaged', function() {
      it('may be partially staged');

      it('may be completely staged');

      it('may discard lines');

      it('may stage an executable mode change');
    });

    describe('staged', function() {
      it('may be partially unstaged');

      it('may be partially staged');

      it('may unstage an executable mode change');
    });
  });
});
