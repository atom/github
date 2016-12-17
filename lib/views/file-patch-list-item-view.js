/** @jsx etch.dom */
/* eslint react/no-unknown-property: "off" */

import etch from 'etch';
import {classNameForStatus} from '../helpers';

export default class FilePatchListItemView {
  constructor(props) {
    this.props = props;
    etch.initialize(this);
    this.props.registerItemElement(this.props.filePatch, this.element);
  }

  update(props) {
    this.props = props;
    this.props.registerItemElement(this.props.filePatch, this.element);
    return etch.update(this);
  }

  render() {
    const {filePatch, selected, ...others} = this.props;
    const status = classNameForStatus[filePatch.status];
    const className = selected ? 'is-selected' : '';

    return (
      <div {...others} className={`github-FilePatchListView-item is-${status} ${className}`}>
        <span className={`github-FilePatchListView-icon icon icon-diff-${status} status-${status}`} />
        <span className="github-FilePatchListView-path">{filePatch.filePath}</span>
      </div>
    );
  }
}
