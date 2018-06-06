import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import FilePatchSelection from '../models/file-patch-selection';
import AtomTextEditor from '../atom/atom-text-editor';
import Marker from '../atom/marker';
import Decoration from '../atom/decoration';

export default class FilePatchView extends React.Component {
  static propTypes = {
    stagingStatus: PropTypes.oneOf(['staged', 'unstaged']).isRequired,
    isPartiallyStaged: PropTypes.bool.isRequired,
    filePatch: PropTypes.object.isRequired,

    tooltips: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);

    this.state = {
      selection: new FilePatchSelection(this.props.filePatch.getHunks()),
    };
  }

  render() {
    const text = this.props.filePatch.getHunks().map(h => h.toString()).join('\n');

    return (
      <div
        className={cx('github-FilePatchView', {'is-staged': !this.isUnstaged(), 'is-unstaged': this.isUnstaged()})}
        tabIndex="-1">

        <AtomTextEditor text={text}>
          <Marker bufferPosition={[0, 0]}>
            <Decoration type="block">
              {this.renderFileHeader()}
            </Decoration>
          </Marker>
        </AtomTextEditor>

      </div>
    );
  }

  renderFileHeader() {
    return (
      <header className="github-FilePatchView-header">
        <span className="github-FilePatchView-title">
          {this.isUnstaged() ? 'Unstaged Changes for ' : 'Staged Changes for '}
          {this.props.filePatch.getPath()}
        </span>
        {this.renderButtonGroup()}
      </header>
    );
  }

  renderButtonGroup() {
    const hasHunks = this.props.filePatch.getHunks().length > 0;

    return (
      <span className="btn-group">
        {this.props.isPartiallyStaged || !hasHunks ? (
          <button className={cx('btn', 'icon', {
            'icon-tasklist': this.isUnstaged(),
            'icon-list-unordered': !this.isUnstaged(),
          })}
          />
        ) : null}
        <button className="btn icon icon-code" />
        {hasHunks ? (
          <button className={cx('btn', 'icon', {
            'icon-move-down': this.isUnstaged(),
            'icon-move-up': !this.isUnstaged(),
          })}>
            {this.isUnstaged() ? 'Stage File' : 'Unstage File'}
          </button>
        ) : null }
      </span>
    );
  }

  isUnstaged() {
    return this.props.stagingStatus === 'unstaged';
  }
}
