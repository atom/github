import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import {RemotePropType, BranchPropType} from '../prop-types';


function getIconClass(icon, isSyncing = false) {
  return cx(
    'github-PushPull-icon',
    'icon',
    isSyncing ? 'icon-sync' : `icon-${icon}`,
    {'animate-rotate': isSyncing},
  );
}

export default class PushPullView extends React.Component {
  static propTypes = {
    currentBranch: BranchPropType.isRequired,
    currentRemote: RemotePropType.isRequired,
    isSyncing: PropTypes.bool,
    behindCount: PropTypes.number,
    aheadCount: PropTypes.number,
    push: PropTypes.func.isRequired,
    pull: PropTypes.func.isRequired,
    fetch: PropTypes.func.isRequired,
  }

  static defaultProps = {
    isSyncing: false,
    behindCount: 0,
    aheadCount: 0,
  }

  onClickPush = clickEvent => {
    this.props.push({
      force: clickEvent.metaKey || clickEvent.ctrlKey,
      setUpstream: !this.props.currentRemote.isPresent(),
    });
  }

  onClickPull = clickEvent => {
    this.props.pull();
  }

  onClickPushPull = clickEvent => {
    if (clickEvent.metaKey || clickEvent.ctrlKey) {
      this.props.push({
        force: true,
      });
    } else {
      this.props.pull();
    }
  }

  onClickPublish = clickEvent => {
    this.props.push({
      setUpstream: !this.props.currentRemote.isPresent(),
    });
  }

  onClickFetch = clickEvent => {
    this.props.fetch();
  }

  render() {
    const isAhead = this.props.aheadCount > 0;
    const isBehind = this.props.behindCount > 0;
    const isUnpublished = !this.props.currentRemote.isPresent();
    const isDetached = !!this.props.currentBranch.detached;
    const isSyncing = this.props.isSyncing;

    return (<div
      className={cx('github-PushPull', 'inline-block', {'github-branch-detached': isDetached})}>
      {isAhead && !isBehind && !isUnpublished && (
        <span onClick={!isSyncing && this.onClickPush}>
          <span className={getIconClass('arrow-up', isSyncing)} />
          Push {this.props.aheadCount}
        </span>
      )}

      {isBehind && !isAhead && !isUnpublished && (
        <span onClick={!isSyncing && this.onClickPull}>
          <span className={getIconClass('arrow-down', isSyncing)} />
          Pull {this.props.behindCount}
        </span>
      )}

      {isBehind && isAhead && !isUnpublished && !isSyncing && (
        <span onClick={this.onClickPushPull}>
          <span className="secondary">
            <span className={getIconClass('arrow-up')} />
            {this.props.aheadCount}{' '}
          </span>
          <span className={getIconClass('arrow-down')} />
          Pull {this.props.behindCount}
        </span>
      )}

      {isBehind && isAhead && !isUnpublished && isSyncing && (
        <span>
          <span className={getIconClass('arrow-down', isSyncing)} />
          Pull {this.props.behindCount}
        </span>
      )}

      {!isBehind && !isAhead && !isUnpublished && !isDetached && (
        <span onClick={!isSyncing && this.onClickFetch}>
          <span className={getIconClass('sync', isSyncing)} />
          Fetch
        </span>
      )}

      {isUnpublished && !isDetached && (
        <span onClick={!isSyncing && this.onClickPublish}>
          <span className={getIconClass('cloud-upload', isSyncing)} />
          Publish
        </span>
      )}

      {isDetached && (
        <span>
          <span className={getIconClass('cloud-upload')} />
          Not on branch
        </span>
      )}
    </div>);
  }
}
