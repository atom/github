import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import {RemotePropType} from '../prop-types';

export default class PushView extends React.Component {
  static propTypes = {
    currentRemote: RemotePropType.isRequired,
    push: PropTypes.func.isRequired,
    pushInProgress: PropTypes.bool,
    aheadCount: PropTypes.number,
  }

  static defaultProps = {
    pushInProgress: false,
    aheadCount: 0,
  }

  onClick = clickEvent => {
    this.props.push({
      force: clickEvent.metaKey || clickEvent.ctrlKey,
      setUpstream: !this.props.currentRemote.isPresent(),
    });
  }

  render() {
    const pushing = this.props.pushInProgress;
    const pushClasses = cx('github-PushPull-icon', 'icon', {'icon-arrow-up': !pushing, 'icon-sync': pushing});
    return (
      <div
        className="github-PushPull github-Push inline-block"
        ref={e => { this.element = e; }}
        onClick={this.onClick}
        // TODO: This should be a blue Atom tooltip
        title="Click to push, Cmd + Click to force push">
        <span className={pushClasses} />
        <span className="github-PushPull-label is-push">
          {this.props.aheadCount ? `${this.props.aheadCount}` : ''}
        </span>
      </div>
    );
  }
}
