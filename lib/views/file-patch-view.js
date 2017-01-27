/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import {CompositeDisposable, Disposable} from 'atom';

import etch from 'etch';
import cx from 'classnames';
import {autobind} from 'core-decorators';

import HunkView from './hunk-view';
import FilePatchSelection from './file-patch-selection';

export default class FilePatchView {
  constructor(props) {
    this.props = props;
    this.selection = new FilePatchSelection(this.props.hunks);
    this.fontSize = atom.config.get('editor.fontSize');
    this.mouseSelectionInProgress = false;

    window.addEventListener('mouseup', this.mouseup);
    this.disposables = new CompositeDisposable();
    this.disposables.add(new Disposable(() => window.removeEventListener('mouseup', this.mouseup)));
    this.disposables.add(atom.config.onDidChange('editor.fontSize', ({newValue}) => {
      this.fontSize = newValue;
      etch.update(this);
    }));

    etch.initialize(this);

    this.disposables.add(this.props.commandRegistry.add(this.element, {
      'github:toggle-patch-selection-mode': () => this.togglePatchSelectionMode(),
      'core:confirm': () => this.didConfirm(),
      'core:move-up': () => this.selectPrevious(),
      'core:move-down': () => this.selectNext(),
      'core:move-right': () => this.didMoveRight(),
      'core:move-to-top': () => this.selectFirst(),
      'core:move-to-bottom': () => this.selectLast(),
      'core:select-up': () => this.selectToPrevious(),
      'core:select-down': () => this.selectToNext(),
      'core:select-to-top': () => this.selectToFirst(),
      'core:select-to-bottom': () => this.selectToLast(),
      'core:select-all': () => this.selectAll(),
      'github:select-next-hunk': () => this.selectNextHunk(),
      'github:select-previous-hunk': () => this.selectPreviousHunk(),
      'github:open-file': () => this.openFile(),
      'github:view-corresponding-diff': () => this.props.didDiveIntoCorrespondingFilePatch(),
      'github:discard-selected-lines': () => this.discardSelection(),
    }));
  }

  update(props) {
    this.props = props;
    this.selection.updateHunks(this.props.hunks);
    return etch.update(this);
  }

  destroy() {
    this.disposables.dispose();
    return etch.destroy(this);
  }

  render() {
    const selectedHunks = this.selection.getSelectedHunks();
    const selectedLines = this.selection.getSelectedLines();
    const headHunk = this.selection.getHeadHunk();
    const headLine = this.selection.getHeadLine();
    const hunkSelectionMode = this.selection.getMode() === 'hunk';
    const unstaged = this.props.stagingStatus === 'unstaged';
    const stageButtonLabelPrefix = unstaged ? 'Stage' : 'Unstage';
    return (
      <div className={cx('github-FilePatchView', {'is-staged': !unstaged, 'is-unstaged': unstaged})} tabIndex="-1"
        onmouseup={this.mouseup}
        style={`font-size: ${this.fontSize}px`}>
        <header className="github-FilePatchView-header">
          <span className="github-FilePatchView-title">
            {unstaged ? 'Unstaged Changes for ' : 'Staged Changes for '}
            {this.props.filePath}
          </span>
          {this.renderButtonGroup()}
        </header>

        <main className="github-FilePatchView-container">
          {this.props.hunks.map(hunk => {
            const isSelected = selectedHunks.has(hunk);
            let stageButtonSuffix = (hunkSelectionMode || !isSelected) ? ' Hunk' : ' Selection';
            if (selectedHunks.size > 1 && selectedHunks.has(hunk)) {
              stageButtonSuffix += 's';
            }
            const stageButtonLabel = stageButtonLabelPrefix + stageButtonSuffix;

            return (
              <HunkView
                key={hunk.getHeader()}
                hunk={hunk}
                isSelected={selectedHunks.has(hunk)}
                hunkSelectionMode={hunkSelectionMode}
                stageButtonLabel={stageButtonLabel}
                selectedLines={selectedLines}
                headLine={headLine}
                headHunk={headHunk}
                mousedownOnHeader={e => this.mousedownOnHeader(e, hunk)}
                mousedownOnLine={this.mousedownOnLine}
                mousemoveOnLine={this.mousemoveOnLine}
                contextMenuOnItem={this.contextMenuOnItem}
                didClickStageButton={() => this.didClickStageButtonForHunk(hunk)}
                registerView={this.props.registerHunkView}
              />
            );
          })}
        </main>
      </div>
    );
  }

  @autobind
  renderButtonGroup() {
    const unstaged = this.props.stagingStatus === 'unstaged';

    return (
      <span className="btn-group">
        {this.props.hasUndoHistory ? (
          <button
            className="btn"
            onclick={this.props.undoLastDiscard}>
            Undo Last Discard
          </button>
        ) : null}
        {this.props.isPartiallyStaged ? (
          <button
            className={cx('btn', 'icon', {'icon-tasklist': unstaged, 'icon-list-unordered': !unstaged})}
            onclick={this.props.didDiveIntoCorrespondingFilePatch}
          />
        ) : null}
        <button
          className="btn icon icon-code"
          onclick={this.openFile}
        />
      </span>
    );
  }

  @autobind
  async contextMenuOnItem(event, hunk, line) {
    const mode = this.selection.getMode();
    if (mode === 'hunk' && !this.selection.getSelectedHunks().has(hunk)) {
      this.selection.selectHunk(hunk, event.shiftKey);
    } else if (mode === 'line' && !this.selection.getSelectedLines().has(line)) {
      this.selection.selectLine(line, event.shiftKey);
    } else {
      return;
    }
    event.stopPropagation();
    await etch.update(this);
    const newEvent = new MouseEvent(event.type, event);
    requestAnimationFrame(() => {
      event.target.parentNode.dispatchEvent(newEvent);
    });
  }

  async mousedownOnHeader(event, hunk) {
    if (event.button !== 0) { return; }
    if (event.ctrlKey || event.metaKey) {
      if (this.selection.getMode() === 'hunk') {
        this.selection.addOrSubtractHunkSelection(hunk);
      } else {
        // TODO: optimize
        hunk.getLines().forEach(line => {
          this.selection.addOrSubtractLineSelection(line);
          this.selection.coalesce();
        });
      }
    } else if (event.shiftKey) {
      if (this.selection.getMode() === 'hunk') {
        this.selection.selectHunk(hunk, true);
      } else {
        const hunkLines = hunk.getLines();
        const tailIndex = this.selection.getLineSelectionTailIndex();
        const selectedHunkAfterTail = tailIndex < hunkLines[0].diffLineNumber;
        if (selectedHunkAfterTail) {
          this.selection.selectLine(hunkLines[hunkLines.length - 1], true);
        } else {
          this.selection.selectLine(hunkLines[0], true);
        }
      }
    } else {
      this.selection.selectHunk(hunk, false);
    }
    this.mouseSelectionInProgress = true;
    await etch.update(this);
  }

  @autobind
  async mousedownOnLine(event, hunk, line) {
    if (event.button !== 0) { return; }
    if (event.ctrlKey || event.metaKey) {
      if (this.selection.getMode() === 'hunk') {
        this.selection.addOrSubtractHunkSelection(hunk);
      } else {
        this.selection.addOrSubtractLineSelection(line);
      }
    } else if (event.shiftKey) {
      if (this.selection.getMode() === 'hunk') {
        this.selection.selectHunk(hunk, true);
      } else {
        this.selection.selectLine(line, true);
      }
    } else if (event.detail === 1) {
      this.selection.selectLine(line, false);
    } else if (event.detail === 2) {
      this.selection.selectHunk(hunk, false);
    }
    this.mouseSelectionInProgress = true;
    await etch.update(this);
  }

  @autobind
  async mousemoveOnLine(event, hunk, line) {
    if (!this.mouseSelectionInProgress) { return; }
    if (this.selection.getMode() === 'hunk') {
      this.selection.selectHunk(hunk, true);
    } else {
      this.selection.selectLine(line, true);
    }
    await etch.update(this);
  }

  @autobind
  mouseup() {
    this.mouseSelectionInProgress = false;
    this.selection.coalesce();
  }

  togglePatchSelectionMode() {
    this.selection.toggleMode();
    return etch.update(this);
  }

  getPatchSelectionMode() {
    return this.selection.getMode();
  }

  getSelectedHunks() {
    return this.selection.getSelectedHunks();
  }

  getSelectedLines() {
    return this.selection.getSelectedLines();
  }

  selectNext() {
    this.selection.selectNext();
    return etch.update(this);
  }

  selectNextHunk() {
    this.selection.jumpToNextHunk();
    return etch.update(this);
  }

  selectToNext() {
    this.selection.selectNext(true);
    this.selection.coalesce();
    return etch.update(this);
  }

  selectPrevious() {
    this.selection.selectPrevious();
    return etch.update(this);
  }

  selectPreviousHunk() {
    this.selection.jumpToPreviousHunk();
    return etch.update(this);
  }

  selectToPrevious() {
    this.selection.selectPrevious(true);
    this.selection.coalesce();
    return etch.update(this);
  }

  selectFirst() {
    this.selection.selectFirst();
    return etch.update(this);
  }

  selectToFirst() {
    this.selection.selectFirst(true);
    return etch.update(this);
  }

  selectLast() {
    this.selection.selectLast();
    return etch.update(this);
  }

  selectToLast() {
    this.selection.selectLast(true);
    return etch.update(this);
  }

  selectAll() {
    this.selection.selectAll();
    return etch.update(this);
  }

  getNextHunkUpdatePromise() {
    return this.selection.getNextUpdatePromise();
  }

  didClickStageButtonForHunk(hunk) {
    if (this.selection.getSelectedHunks().has(hunk)) {
      return this.props.attemptLineStageOperation(this.selection.getSelectedLines());
    } else {
      this.selection.selectHunk(hunk);
      return this.props.attemptHunkStageOperation(hunk);
    }
  }

  didConfirm() {
    return this.didClickStageButtonForHunk([...this.selection.getSelectedHunks()][0]);
  }

  didMoveRight() {
    if (this.props.didSurfaceFile) {
      this.props.didSurfaceFile();
    }
  }

  focus() {
    this.element.focus();
  }

  @autobind
  openFile() {
    let lineNumber = 0;
    const firstSelectedLine = Array.from(this.selection.getSelectedLines())[0];
    if (firstSelectedLine && firstSelectedLine.newLineNumber > -1) {
      lineNumber = firstSelectedLine.newLineNumber;
    } else {
      const firstSelectedHunk = Array.from(this.selection.getSelectedHunks())[0];
      lineNumber = firstSelectedHunk ? firstSelectedHunk.getNewStartRow() : 0;
    }
    return this.props.openCurrentFile({lineNumber});
  }

  discardSelection() {
    const selectedLines = this.selection.getSelectedLines();
    return selectedLines.size ? this.props.discardLines(selectedLines) : null;
  }
}
