/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';
import {classNameForStatus} from '../helpers';

export default class FilePatchListItemView {
  constructor(props) {
    this.props = props;
    etch.initialize(this);
    this.props.registerItemElement(this.props.mergeConflict, this.element);
  }

  update(props) {
    this.props = props;
    this.props.registerItemElement(this.props.mergeConflict, this.element);
    return etch.update(this);
  }

  render() {
    const {mergeConflict, selected, ...others} = this.props;
    const fileStatus = classNameForStatus[mergeConflict.status.file];
    const oursStatus = classNameForStatus[mergeConflict.status.ours];
    const theirsStatus = classNameForStatus[mergeConflict.status.theirs];
    const className = selected ? 'is-selected' : '';

    return (
      <div {...others} className={`github-MergeConflictListView-item is-${fileStatus} ${className}`}>
        <div className="github-FilePatchListView-item github-FilePatchListView-pathItem">
          <span className={`github-FilePatchListView-icon icon icon-diff-${fileStatus} status-${fileStatus}`} />
          <span className="github-FilePatchListView-path">{mergeConflict.filePath}</span>
          <span className={'github-FilePatchListView ours-theirs-info'}>
            <span className={`github-FilePatchListView-icon icon icon-diff-${oursStatus}`} />
            <span className={`github-FilePatchListView-icon icon icon-diff-${theirsStatus}`} />
          </span>
        </div>
        <div className="github-FilePatchListView-item github-FilePatchListView-resolutionItem">
          {this.renderRemainingConflicts()}
        </div>
      </div>
    );
  }

  renderRemainingConflicts() {
    if (this.props.remainingConflicts === 0) {
      return (
        <span className="icon icon-check github-RemainingConflicts text-success">
          ready
        </span>
      );
    } else if (this.props.remainingConflicts !== undefined) {
      const pluralConflicts = this.props.remainingConflicts === 1 ? '' : 's';

      return (
        <span className="github-RemainingConflicts text-warning">
          {this.props.remainingConflicts} conflict{pluralConflicts} remaining
        </span>
      );
    } else {
      return (
        <span className="github-RemainingConflicts text-subtle">calculating</span>
      );
    }
  }
}
