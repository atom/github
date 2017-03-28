import React from 'react';

import {CompositeDisposable, Disposable} from 'atom';
import cx from 'classnames';
import {autobind} from 'core-decorators';

import HunkView from './hunk-view';
import Commands, {Command} from './commands';
import FilePatchSelection from './file-patch-selection';
import EventWatcher from '../event-watcher';
import {setStatePromise} from '../helpers';

export default class FilePatchView extends React.Component {
  static propTypes = {
    commandRegistry: React.PropTypes.object.isRequired,
    filePath: React.PropTypes.string.isRequired,
    hunks: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
    stagingStatus: React.PropTypes.oneOf(['unstaged', 'staged']).isRequired,
    isPartiallyStaged: React.PropTypes.bool.isRequired,
    hasUndoHistory: React.PropTypes.bool.isRequired,
    attemptLineStageOperation: React.PropTypes.func.isRequired,
    attemptHunkStageOperation: React.PropTypes.func.isRequired,
    discardLines: React.PropTypes.func.isRequired,
    undoLastDiscard: React.PropTypes.func.isRequired,
    openCurrentFile: React.PropTypes.func.isRequired,
    didSurfaceFile: React.PropTypes.func.isRequired,
    didDiveIntoCorrespondingFilePatch: React.PropTypes.func.isRequired,
    eventWatcher: React.PropTypes.instanceOf(EventWatcher),
  }

  static defaultProps = {
    eventWatcher: new EventWatcher(),
  }

  constructor(props, context) {
    super(props, context);

    this.mouseSelectionInProgress = false;

    window.addEventListener('mouseup', this.mouseup);
    this.disposables = new CompositeDisposable();
    this.disposables.add(new Disposable(() => window.removeEventListener('mouseup', this.mouseup)));

    this.state = {
      selection: new FilePatchSelection(this.props.hunks),
    };
  }

  componentWillReceiveProps(nextProps) {
    const hunksChanged = this.props.hunks.length !== nextProps.hunks.length ||
      this.props.hunks.some((hunk, index) => hunk !== nextProps.hunks[index]);

    if (hunksChanged) {
      this.setState(prevState => {
        return {
          selection: prevState.selection.updateHunks(nextProps.hunks),
        };
      }, () => {
        nextProps.eventWatcher.resolvePatchChangedPromise();
      });
    }
  }

  render() {
    const selectedHunks = this.state.selection.getSelectedHunks();
    const selectedLines = this.state.selection.getSelectedLines();
    const headHunk = this.state.selection.getHeadHunk();
    const headLine = this.state.selection.getHeadLine();
    const hunkSelectionMode = this.state.selection.getMode() === 'hunk';

    const unstaged = this.props.stagingStatus === 'unstaged';
    const stageButtonLabelPrefix = unstaged ? 'Stage' : 'Unstage';

    return (
      <div
        className={cx('github-FilePatchView', {'is-staged': !unstaged, 'is-unstaged': unstaged})}
        tabIndex="-1"
        onMouseUp={this.mouseup}
        ref={e => { this.element = e; }}>

        <Commands registry={this.props.commandRegistry} target=".github-FilePatchView">
          <Command command="github:toggle-patch-selection-mode" callback={this.togglePatchSelectionMode} />
          <Command command="core:confirm" callback={this.didConfirm} />
          <Command command="core:move-up" callback={this.selectPrevious} />
          <Command command="core:move-down" callback={this.selectNext} />
          <Command command="core:move-right" callback={this.didMoveRight} />
          <Command command="core:move-to-top" callback={this.selectFirst} />
          <Command command="core:move-to-bottom" callback={this.selectLast} />
          <Command command="core:select-up" callback={this.selectToPrevious} />
          <Command command="core:select-down" callback={this.selectToNext} />
          <Command command="core:select-to-top" callback={this.selectToFirst} />
          <Command command="core:select-to-bottom" callback={this.selectToLast} />
          <Command command="core:select-all" callback={this.selectAll} />
          <Command command="github:select-next-hunk" callback={this.selectNextHunk} />
          <Command command="github:select-previous-hunk" callback={this.selectPreviousHunk} />
          <Command command="github:open-file" callback={this.openFile} />
          <Command
            command="github:view-corresponding-diff"
            callback={() => this.props.isPartiallyStaged && this.props.didDiveIntoCorrespondingFilePatch()}
          />
          <Command command="github:discard-selected-lines" callback={this.discardSelection} />
          <Command
            command="core:undo"
            callback={() => this.props.hasUndoHistory && this.props.undoLastDiscard()}
          />
        </Commands>

        <Commands registry={this.props.commandRegistry} target="atom-workspace">
          <Command
            command="github:undo-last-discard-in-diff-view"
            callback={() => this.props.hasUndoHistory && this.props.undoLastDiscard()}
          />
        </Commands>

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
        {this.props.hasUndoHistory && unstaged ? (
          <button
            className="btn icon icon-history"
            onClick={this.props.undoLastDiscard}>
            Undo Discard
          </button>
        ) : null}
        {this.props.isPartiallyStaged ? (
          <button
            className={cx('btn', 'icon', {'icon-tasklist': unstaged, 'icon-list-unordered': !unstaged})}
            onClick={this.props.didDiveIntoCorrespondingFilePatch}
          />
        ) : null}
        <button
          className="btn icon icon-code"
          onClick={this.openFile}
        />
        <button
          className={cx('btn', 'icon', {'icon-move-down': unstaged, 'icon-move-up': !unstaged})}
          onClick={this.stageOrUnstageAll}>
          {unstaged ? 'Stage All' : 'Unstage All'}
        </button>
      </span>
    );
  }

  componentWillUnmount() {
    this.disposables.dispose();
  }

  @autobind
  async contextMenuOnItem(event, hunk, line) {
    const mode = this.state.selection.getMode();
    if (mode === 'hunk' && !this.state.selection.getSelectedHunks().has(hunk)) {
      await setStatePromise(prevState => {
        return {selection: prevState.selection.selectHunk(hunk, event.shiftKey)};
      });
    } else if (mode === 'line' && !this.state.selection.getSelectedLines().has(line)) {
      await setStatePromise(prevState => {
        return {selection: prevState.selection.selectLine(line, event.shiftKey)};
      });
    } else {
      return;
    }
    event.stopPropagation();

    const newEvent = new MouseEvent(event.type, event);
    requestAnimationFrame(() => {
      event.target.parentNode.dispatchEvent(newEvent);
    });
  }

  mousedownOnHeader(event, hunk) {
    if (event.button !== 0) { return; }
    const windows = process.platform === 'win32';
    if (event.ctrlKey && !windows) { return; } // simply open context menu

    this.mouseSelectionInProgress = true;

    this.setState(prevState => {
      let selection = prevState.selection;
      if (event.metaKey || (event.ctrlKey && windows)) {
        if (selection.getMode() === 'hunk') {
          selection = selection.addOrSubtractHunkSelection(hunk);
        } else {
          // TODO: optimize
          selection = hunk.getLines().reduce(
            (current, line) => current.addOrSubtractLineSelection(line).coalesce(),
            selection,
          );
        }
      } else if (event.shiftKey) {
        if (selection.getMode() === 'hunk') {
          selection = selection.selectHunk(hunk, true);
        } else {
          const hunkLines = hunk.getLines();
          const tailIndex = selection.getLineSelectionTailIndex();
          const selectedHunkAfterTail = tailIndex < hunkLines[0].diffLineNumber;
          if (selectedHunkAfterTail) {
            selection = selection.selectLine(hunkLines[hunkLines.length - 1], true);
          } else {
            selection = selection.selectLine(hunkLines[0], true);
          }
        }
      } else {
        selection = selection.selectHunk(hunk, false);
      }

      return {selection};
    });
  }

  @autobind
  mousedownOnLine(event, hunk, line) {
    if (event.button !== 0) { return; }
    const windows = process.platform === 'win32';
    if (event.ctrlKey && !windows) { return; } // simply open context menu

    this.mouseSelectionInProgress = true;

    this.setState(prevState => {
      let selection = prevState.selection;

      if (event.metaKey || (event.ctrlKey && windows)) {
        if (selection.getMode() === 'hunk') {
          selection = selection.addOrSubtractHunkSelection(hunk);
        } else {
          selection = selection.addOrSubtractLineSelection(line);
        }
      } else if (event.shiftKey) {
        if (selection.getMode() === 'hunk') {
          selection = selection.selectHunk(hunk, true);
        } else {
          selection = selection.selectLine(line, true);
        }
      } else if (event.detail === 1) {
        selection = selection.selectLine(line, false);
      } else if (event.detail === 2) {
        selection = selection.selectHunk(hunk, false);
      }

      return {selection};
    });
  }

  @autobind
  mousemoveOnLine(event, hunk, line) {
    if (!this.mouseSelectionInProgress) { return; }

    this.setState(prevState => {
      let selection = null;
      if (prevState.selection.getMode() === 'hunk') {
        selection = prevState.selection.selectHunk(hunk, true);
      } else {
        selection = prevState.selection.selectLine(line, true);
      }
      return {selection};
    });
  }

  @autobind
  mouseup() {
    this.mouseSelectionInProgress = false;
    this.setState(prevState => {
      return {selection: prevState.selection.coalesce()};
    });
  }

  @autobind
  togglePatchSelectionMode() {
    this.setState(prevState => ({selection: prevState.selection.toggleMode()}));
  }

  getPatchSelectionMode() {
    return this.state.selection.getMode();
  }

  getSelectedHunks() {
    return this.state.selection.getSelectedHunks();
  }

  getSelectedLines() {
    return this.state.selection.getSelectedLines();
  }

  @autobind
  selectNext() {
    this.setState(prevState => ({selection: prevState.selection.selectNext()}));
  }

  @autobind
  selectNextHunk() {
    this.setState(prevState => ({selection: prevState.selection.jumpToNextHunk()}));
  }

  @autobind
  selectToNext() {
    this.setState(prevState => {
      return {selection: prevState.selection.selectNext(true).coalesce()};
    });
  }

  @autobind
  selectPrevious() {
    this.setState(prevState => ({selection: prevState.selection.selectPrevious()}));
  }

  @autobind
  selectPreviousHunk() {
    this.setState(prevState => ({selection: prevState.selection.jumpToPreviousHunk()}));
  }

  @autobind
  selectToPrevious() {
    this.setState(prevState => {
      return {selection: prevState.selection.selectPrevious(true).coalesce()};
    });
  }

  @autobind
  selectFirst() {
    this.setState(prevState => ({selection: prevState.selection.selectFirst()}));
  }

  @autobind
  selectToFirst() {
    this.setState(prevState => ({selection: prevState.selection.selectFirst(true)}));
  }

  @autobind
  selectLast() {
    this.setState(prevState => ({selection: prevState.selection.selectLast()}));
  }

  @autobind
  selectToLast() {
    this.setState(prevState => ({selection: prevState.selection.selectLast(true)}));
  }

  @autobind
  selectAll() {
    return setStatePromise(this, prevState => ({selection: prevState.selection.selectAll()}));
  }

  getNextHunkUpdatePromise() {
    return this.state.selection.getNextUpdatePromise();
  }

  didClickStageButtonForHunk(hunk) {
    if (this.state.selection.getSelectedHunks().has(hunk)) {
      this.props.attemptLineStageOperation(this.state.selection.getSelectedLines());
    } else {
      this.setState(prevState => ({selection: prevState.selection.selectHunk(hunk)}), () => {
        this.props.attemptHunkStageOperation(hunk);
      });
    }
  }

  @autobind
  didConfirm() {
    return this.didClickStageButtonForHunk([...this.state.selection.getSelectedHunks()][0]);
  }

  @autobind
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
    const firstSelectedLine = Array.from(this.state.selection.getSelectedLines())[0];
    if (firstSelectedLine && firstSelectedLine.newLineNumber > -1) {
      lineNumber = firstSelectedLine.newLineNumber;
    } else {
      const firstSelectedHunk = Array.from(this.state.selection.getSelectedHunks())[0];
      lineNumber = firstSelectedHunk ? firstSelectedHunk.getNewStartRow() : 0;
    }
    return this.props.openCurrentFile({lineNumber});
  }

  @autobind
  async stageOrUnstageAll() {
    await this.selectAll();
    this.didConfirm();
  }

  @autobind
  discardSelection() {
    const selectedLines = this.state.selection.getSelectedLines();
    return selectedLines.size ? this.props.discardLines(selectedLines) : null;
  }
}
