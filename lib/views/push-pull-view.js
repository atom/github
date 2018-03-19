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


  componentDidMount() {
    this.setTooltip();
  }

  componentDidUpdate() {
    this.tooltip.dispose();
    this.setTooltip();
  }

  setTooltip = () => {
    this.tooltip = atom.tooltips.add(this.node, {
      title: `<div style="text-align: left; line-height: 1.2em;">${this.clickNode.dataset.tooltip}</div>`,
      delay: {show: 200, hide: 100},
      html: true,
    });
  }

  onClickPush = clickEvent => {
    if (this.props.isSyncing) {
      return;
    }
    this.props.push({
      force: clickEvent.metaKey || clickEvent.ctrlKey,
      setUpstream: !this.props.currentRemote.isPresent(),
    });
  }

  onClickPull = clickEvent => {
    if (this.props.isSyncing) {
      return;
    }
    this.props.pull();
  }

  onClickPushPull = clickEvent => {
    if (this.props.isSyncing) {
      return;
    }
    if (clickEvent.metaKey || clickEvent.ctrlKey) {
      this.props.push({
        force: true,
      });
    } else {
      this.props.pull();
    }
  }

  onClickPublish = clickEvent => {
    if (this.props.isSyncing) {
      return;
    }
    this.props.push({
      setUpstream: !this.props.currentRemote.isPresent(),
    });
  }

  onClickFetch = clickEvent => {
    if (this.props.isSyncing) {
      return;
    }
    this.props.fetch();
  }

  render() {
    const isAhead = this.props.aheadCount > 0;
    const isBehind = this.props.behindCount > 0;
    const isUnpublished = !this.props.currentRemote.isPresent();
    const isDetached = !!this.props.currentBranch.detached;
    const isSyncing = this.props.isSyncing;

    return (<div
      ref={node => (this.node = node)}
      className={cx('github-PushPull', 'inline-block', {'github-branch-detached': isDetached})}>

      {isAhead && !isBehind && !isUnpublished && (
        <a
          ref={node => (this.clickNode = node)}
          onClick={this.onClickPush}
          className="push-pull-target"
          data-tooltip="Click to push<br />Cmd-click to force push<br />Right-click for more">
          <span className={getIconClass('arrow-up', isSyncing)} />
          Push {this.props.aheadCount}
          </a>
          )}

      {isBehind && !isAhead && !isUnpublished && (
      <a
        ref={node => (this.clickNode = node)}
        onClick={this.onClickPull}
        className="push-pull-target"
        data-tooltip="Click to pull<br />Right-click for more">
        <span className={getIconClass('arrow-down', isSyncing)} />
          Pull {this.props.behindCount}
      </a>
      )}

      {isBehind && isAhead && !isUnpublished && !isSyncing && (
        <a
          ref={node => (this.clickNode = node)}
          onClick={this.onClickPushPull}
          className="push-pull-target"
          data-tooltip="Click to push<br />Cmd-click to force push<br />Right-click for more">
          <span className="secondary">
            <span className={getIconClass('arrow-up')} />
            {this.props.aheadCount}{' '}
          </span>
          <span className={getIconClass('arrow-down')} />
          Pull {this.props.behindCount}
          </a>
          )}

      {isBehind && isAhead && !isUnpublished && isSyncing && (
      <span>
        <span className={getIconClass('arrow-down', isSyncing)} />
          Pull {this.props.behindCount}
      </span>
          )}

      {!isBehind && !isAhead && !isUnpublished && !isDetached && (
      <a
        ref={node => (this.clickNode = node)}
        onClick={this.onClickFetch}
        className="push-pull-target"
        data-tooltip="Click to fetch<br />Right-click for more">
        <span className={getIconClass('sync', isSyncing)} />
          Fetch
        </a>
      )}

      {isUnpublished && !isDetached && (
        <a
          ref={node => (this.clickNode = node)}
          onClick={this.onClickPublish}
          className="push-pull-target"
          data-tooltip="Click to publish<br />Right-click for more">
          <span className={getIconClass('cloud-upload', isSyncing)} />
          Publish
        </a>
      )}

      {isDetached && (
        <span ref={node => (this.clickNode = node)}
          className="push-pull-target"
          data-tooltip={'Create a branch if you wish to push your work anywhere'}>
          <span className={getIconClass('cloud-upload')} />
          Not on branch
        </span>
      )}
    </div>);
  }
}
