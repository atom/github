/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import {Disposable, CompositeDisposable} from 'atom';

import etch from 'etch';
import {autobind} from 'core-decorators';

import FilePatchListItemView from './file-patch-list-item-view';
import MergeConflictListItemView from './merge-conflict-list-item-view';
import CompositeListSelection from './composite-list-selection';
import {shortenSha} from '../helpers';

const debounce = (fn, wait) => {
  let timeout;
  return (...args) => {
    return new Promise(resolve => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        resolve(fn(...args));
      }, wait);
    });
  };
};

export default class StagingView {
  constructor(props) {
    this.props = props;
    atom.config.observe('github.keyboardNavigationDelay', value => {
      if (value === 0) {
        this.debouncedDidChangeSelectedItem = this.didChangeSelectedItems;
      } else {
        this.debouncedDidChangeSelectedItem = debounce(this.didChangeSelectedItems, value);
      }
    });
    this.mouseSelectionInProgress = false;
    this.listElementsByItem = new WeakMap();

    this.selection = new CompositeListSelection({
      listsByKey: {
        unstaged: this.props.unstagedChanges,
        conflicts: this.props.mergeConflicts || [],
        staged: this.props.stagedChanges,
      },
      idForItem: item => item.filePath,
    });
    etch.initialize(this);

    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(this.props.commandRegistry.add(this.element, {
      'core:move-up': () => this.selectPrevious(),
      'core:move-down': () => this.selectNext(),
      'core:move-left': () => this.diveIntoSelection(),
      'core:select-up': () => this.selectPrevious(true),
      'core:select-down': () => this.selectNext(true),
      'core:select-all': () => this.selectAll(),
      'core:move-to-top': () => this.selectFirst(),
      'core:move-to-bottom': () => this.selectLast(),
      'core:select-to-top': () => this.selectFirst(true),
      'core:select-to-bottom': () => this.selectLast(true),
      'core:confirm': () => this.confirmSelectedItems(),
      'github:activate-next-list': () => this.activateNextList(),
      'github:activate-previous-list': () => this.activatePreviousList(),
    }));
    window.addEventListener('mouseup', this.mouseup);
    this.subscriptions.add(new Disposable(() => window.removeEventListener('mouseup', this.mouseup)));
  }

  update(props) {
    this.props = props;
    this.selection.updateLists({
      unstaged: this.props.unstagedChanges,
      conflicts: this.props.mergeConflicts || [],
      staged: this.props.stagedChanges,
    });
    return etch.update(this);
  }

  @autobind
  activateNextList() {
    if (!this.selection.activateNextSelection()) {
      return false;
    }

    this.selection.coalesce();
    this.didChangeSelectedItems();
    etch.update(this);
    return true;
  }

  @autobind
  activatePreviousList() {
    if (!this.selection.activatePreviousSelection()) {
      return false;
    }

    this.selection.coalesce();
    this.didChangeSelectedItems();
    etch.update(this);
    return true;
  }

  activateLastList() {
    if (!this.selection.activateLastSelection()) {
      return false;
    }

    this.selection.coalesce();
    this.didChangeSelectedItems();
    etch.update(this);
    return true;
  }

  @autobind
  stageAll() {
    const filePaths = this.props.unstagedChanges.map(filePatch => filePatch.filePath);
    return this.props.attemptFileStageOperation(filePaths, 'unstaged');
  }

  @autobind
  unstageAll() {
    const filePaths = this.props.stagedChanges.map(filePatch => filePatch.filePath);
    return this.props.attemptFileStageOperation(filePaths, 'staged');
  }

  confirmSelectedItems() {
    const itemPaths = Array.from(this.selection.getSelectedItems()).map(item => item.filePath);
    return this.props.attemptFileStageOperation(itemPaths, this.selection.getActiveListKey());
  }

  getNextListUpdatePromise() {
    return this.selection.getNextUpdatePromise();
  }

  selectPrevious(preserveTail = false) {
    this.selection.selectPreviousItem(preserveTail);
    this.selection.coalesce();
    if (!preserveTail) { this.debouncedDidChangeSelectedItem(); }
    return etch.update(this);
  }

  selectNext(preserveTail = false) {
    this.selection.selectNextItem(preserveTail);
    this.selection.coalesce();
    if (!preserveTail) { this.debouncedDidChangeSelectedItem(); }
    return etch.update(this);
  }

  selectAll() {
    this.selection.selectAllItems();
    this.selection.coalesce();
    return etch.update(this);
  }

  selectFirst(preserveTail = false) {
    this.selection.selectFirstItem(preserveTail);
    this.selection.coalesce();
    if (!preserveTail) { this.debouncedDidChangeSelectedItem(); }
    return etch.update(this);
  }

  selectLast(preserveTail = false) {
    this.selection.selectLastItem(preserveTail);
    this.selection.coalesce();
    if (!preserveTail) { this.debouncedDidChangeSelectedItem(); }
    return etch.update(this);
  }

  @autobind
  diveIntoSelection() {
    const selectedItems = this.selection.getSelectedItems();
    if (selectedItems.size !== 1) {
      return;
    }

    const selectedItem = selectedItems.values().next().value;
    const stagingStatus = this.selection.getActiveListKey();

    if (stagingStatus === 'conflicts') {
      if (this.props.didDiveIntoMergeConflictPath) {
        this.props.didDiveIntoMergeConflictPath(selectedItem.filePath);
      }
    } else {
      if (this.props.didDiveIntoFilePath) {
        const amending = this.props.isAmending && this.selection.getActiveListKey() === 'staged';
        this.props.didDiveIntoFilePath(selectedItem.filePath, this.selection.getActiveListKey(), {amending});
      }
    }
  }

  writeAfterUpdate() {
    const headItem = this.selection.getHeadItem();
    if (headItem) { this.listElementsByItem.get(headItem).scrollIntoViewIfNeeded(); }
  }

  // Directly modify the selection to include only the item identified by the file path and stagingStatus tuple.
  // Re-render the component, but don't notify didSelectSingleItem() or other callback functions. This is useful to
  // avoid circular callback loops for actions originating in FilePatchView or TextEditors with merge conflicts.
  quietlySelectItem(filePath, stagingStatus) {
    const item = this.selection.findItem((each, key) => each.filePath === filePath && key === stagingStatus);
    if (!item) {
      return Promise.reject(new Error(`Unable to find item at path ${filePath} with staging status ${stagingStatus}`));
    }

    this.selection.selectItem(item);
    return etch.update(this);
  }

  @autobind
  didChangeSelectedItems() {
    const selectedItems = Array.from(this.selection.getSelectedItems());
    if (this.isFocused() && selectedItems.length === 1) {
      this.didSelectSingleItem(selectedItems[0]);
    }
  }

  didSelectSingleItem(selectedItem) {
    if (this.selection.getActiveListKey() === 'conflicts') {
      if (this.props.didSelectMergeConflictFile) {
        this.props.didSelectMergeConflictFile(selectedItem.filePath);
      }
    } else {
      if (this.props.didSelectFilePath) {
        const amending = this.props.isAmending && this.selection.getActiveListKey() === 'staged';
        this.props.didSelectFilePath(
          selectedItem.filePath,
          this.selection.getActiveListKey(),
          {amending, activate: true},
        );
      }
    }
  }

  @autobind
  mousedownOnItem(event, item) {
    if (event.detail >= 2) {
      return this.props.attemptFileStageOperation([item.filePath], this.selection.listKeyForItem(item));
    } else {
      if (event.ctrlKey || event.metaKey) {
        this.selection.addOrSubtractSelection(item);
      } else {
        this.selection.selectItem(item, event.shiftKey);
      }
      return etch.update(this).then(() => {
        this.mouseSelectionInProgress = true;
      });
    }
  }

  @autobind
  mousemoveOnItem(event, item) {
    if (this.mouseSelectionInProgress) {
      this.selection.selectItem(item, true);
      return etch.update(this);
    } else {
      return Promise.resolve();
    }
  }

  @autobind
  mouseup() {
    if (this.mouseSelectionInProgress) {
      this.mouseSelectionInProgress = false;
      this.selection.coalesce();
      this.didChangeSelectedItems();
    }
  }

  render() {
    const selectedItems = this.selection.getSelectedItems();

    return (
      <div
        className={`github-StagingView ${this.selection.getActiveListKey()}-changes-focused`}
        style={{width: 200}}
        tabIndex="-1">
        <div className={`github-StagingView-group github-UnstagedChanges ${this.getFocusClass('unstaged')}`}>
          <header className="github-StagingView-header">
            <span className="icon icon-list-unordered" />
            <span className="github-StagingView-title">Unstaged Changes</span>
            { this.props.unstagedChanges.length ? this.renderStageAllButton() : null }
          </header>

          <div ref="unstagedChanges" className="github-StagingView-list github-FilePatchListView">
            {
              this.props.unstagedChanges.map(filePatch => (
                <FilePatchListItemView
                  key={filePatch.filePath}
                  registerItemElement={this.registerItemElement}
                  filePatch={filePatch}
                  onmousedown={event => this.mousedownOnItem(event, filePatch)}
                  onmousemove={event => this.mousemoveOnItem(event, filePatch)}
                  selected={selectedItems.has(filePatch)}
                />
              ))
            }
          </div>
        </div>
        { this.renderMergeConflicts() }
        <div className={`github-StagingView-group github-StagedChanges ${this.getFocusClass('staged')}`} >
          <header className="github-StagingView-header">
            <span className="icon icon-tasklist" />
            <span className="github-StagingView-title">
              Staged Changes
              {
                this.props.isAmending
                  ? ` (amending ${shortenSha(this.props.lastCommit.sha)})`
                  : ''
              }
            </span>
            { this.props.stagedChanges.length ? this.renderUnstageAllButton() : null }
          </header>
          <div ref="stagedChanges" className="github-StagingView-list github-FilePatchListView">
            {
              this.props.stagedChanges.map(filePatch => (
                <FilePatchListItemView
                  key={filePatch.filePath}
                  filePatch={filePatch}
                  registerItemElement={this.registerItemElement}
                  onmousedown={event => this.mousedownOnItem(event, filePatch)}
                  onmousemove={event => this.mousemoveOnItem(event, filePatch)}
                  selected={selectedItems.has(filePatch)}
                />
              ))
            }
          </div>
        </div>
      </div>
    );
  }

  renderMergeConflicts() {
    const mergeConflicts = this.props.mergeConflicts;

    if (mergeConflicts && mergeConflicts.length > 0) {
      const selectedItems = this.selection.getSelectedItems();
      return (
        <div className={`github-StagingView-group github-MergeConflictPaths ${this.getFocusClass('conflicts')}`}>
          <header className="github-StagingView-header">
            <span className={'github-FilePatchListView-icon icon icon-alert status-modified'} />
            <span className="github-StagingView-title">Merge Conflicts</span>
          </header>
          <div ref="mergeConflicts" className="github-StagingView-list github-FilePatchListView">
            {
              mergeConflicts.map(mergeConflict => (
                <MergeConflictListItemView
                  key={mergeConflict.filePath}
                  mergeConflict={mergeConflict}
                  registerItemElement={this.registerItemElement}
                  onmousedown={event => this.mousedownOnItem(event, mergeConflict)}
                  onmousemove={event => this.mousemoveOnItem(event, mergeConflict)}
                  selected={selectedItems.has(mergeConflict)}
                />
              ))
            }
          </div>
        </div>
      );
    } else {
      return <noscript />;
    }
  }

  renderStageAllButton() {
    return (
      <button className="github-StagingView-headerButton icon icon-move-down"
        onclick={this.stageAll}>Stage All</button>
    );
  }

  renderUnstageAllButton() {
    return (
      <button className="github-StagingView-headerButton icon icon-move-up"
        onclick={this.unstageAll}>Unstage All</button>
    );
  }

  getFocusClass(listKey) {
    return this.selection.getActiveListKey() === listKey ? 'is-focused' : '';
  }

  @autobind
  registerItemElement(item, element) {
    this.listElementsByItem.set(item, element);
  }

  destroy() {
    this.subscriptions.dispose();
    etch.destroy(this);
  }

  focus() {
    this.element.focus();
  }

  isFocused() {
    return document.activeElement === this.element;
  }
}
