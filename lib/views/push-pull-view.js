import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import {RemotePropType, BranchPropType} from '../prop-types';

import Tooltip from './tooltip';

function getIconClass(icon, animation) {
  return cx(
    'github-PushPull-icon',
    'icon',
    `icon-${icon}`,
    {[`animate-${animation}`]: !!animation},
  );
}

export default class PushPullView extends React.Component {
  static propTypes = {
    currentBranch: BranchPropType.isRequired,
    currentRemote: RemotePropType.isRequired,
    isSyncing: PropTypes.bool,
    isFetching: PropTypes.bool,
    isPulling: PropTypes.bool,
    isPushing: PropTypes.bool,
    behindCount: PropTypes.number,
    aheadCount: PropTypes.number,
    push: PropTypes.func.isRequired,
    pull: PropTypes.func.isRequired,
    fetch: PropTypes.func.isRequired,
    originExists: PropTypes.bool,
    tooltipManager: PropTypes.object.isRequired,
  }

  static defaultProps = {
    isSyncing: false,
    isFetching: false,
    isPulling: false,
    isPushing: false,
    behindCount: 0,
    aheadCount: 0,
  }

  componentDidMount() {
    // unfortunately we need a forceUpdate here to ensure that the <Tooltip>
    // component has a valid ref to target
    this.forceUpdate();
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

  getTooltip(message) {
    // cache the tileNode for when <Tooltip> calls the "target" getter function
    const target = this.tileNode;
    // only set up a <Tooltip> if we have a target ref to point it to
    return target && (
      <Tooltip
        key="tooltip"
        manager={this.props.tooltipManager}
        target={() => target}
        title={`<div style="text-align: left; line-height: 1.2em;">${message}</div>`}
        showDelay={200}
        hideDelay={100}
      />
    );
  }

  getTileStates() {
    return {
      fetching: {
        tooltip: 'Fetching from remote',
        icon: 'sync',
        text: 'Fetching',
        iconAnimation: 'rotate',
      },
      pulling: {
        tooltip: 'Pulling from remote',
        icon: 'arrow-down',
        text: 'Pulling',
        iconAnimation: 'down',
      },
      pushing: {
        tooltip: 'Pushing to remote',
        icon: 'arrow-up',
        text: 'Pushing',
        iconAnimation: 'up',
      },
      ahead: {
        onClick: this.onClickPush,
        tooltip: 'Click to push<br />Cmd-click to force push<br />Right-click for more',
        icon: 'arrow-up',
        text: `Push ${this.props.aheadCount}`,
      },
      behind: {
        onClick: this.onClickPull,
        tooltip: 'Click to pull<br />Right-click for more',
        icon: 'arrow-down',
        text: `Pull ${this.props.behindCount}`,
      },
      aheadBehind: {
        onClick: this.onClickPushPull,
        tooltip: 'Click to pull<br />Cmd-click to force push<br />Right-click for more',
        icon: 'arrow-down',
        text: `Pull ${this.props.behindCount}`,
        secondaryIcon: 'arrow-up',
        secondaryText: `${this.props.aheadCount} `,
      },
      published: {
        onClick: this.onClickFetch,
        tooltip: 'Click to fetch<br />Right-click for more',
        icon: 'sync',
        text: 'Fetch',
      },
      unpublished: {
        onClick: this.onClickPublish,
        tooltip: 'Click to set up a remote tracking branch<br />Right-click for more',
        icon: 'cloud-upload',
        text: 'Publish',
      },
      noRemote: {
        tooltip: 'There is no remote named "origin"',
        icon: 'stop',
        text: 'No remote',
      },
      detached: {
        tooltip: 'Create a branch if you wish to push your work anywhere',
        icon: 'stop',
        text: 'Not on branch',
      },
    };
  }

  render() {
    const isAhead = this.props.aheadCount > 0;
    const isBehind = this.props.behindCount > 0;
    const isUnpublished = !this.props.currentRemote.isPresent();
    const isDetached = !!this.props.currentBranch.detached;
    const isFetching = this.props.isFetching;
    const isPulling = this.props.isPulling;
    const isPushing = this.props.isPushing;
    const hasOrigin = !!this.props.originExists;

    const tileStates = this.getTileStates();

    let tileState;

    if (isFetching) {
      tileState = tileStates.fetching;
    } else if (isPulling) {
      tileState = tileStates.pulling;
    } else if (isPushing) {
      tileState = tileStates.pushing;
    } else if (isAhead && !isBehind && !isUnpublished) {
      tileState = tileStates.ahead;
    } else if (isBehind && !isAhead && !isUnpublished) {
      tileState = tileStates.behind;
    } else if (isBehind && isAhead && !isUnpublished) {
      tileState = tileStates.aheadBehind;
    } else if (!isBehind && !isAhead && !isUnpublished && !isDetached) {
      tileState = tileStates.published;
    } else if (isUnpublished && !isDetached && hasOrigin) {
      tileState = tileStates.unpublished;
    } else if (isUnpublished && !isDetached && !hasOrigin) {
      tileState = tileStates.noRemote;
    } else if (isDetached) {
      tileState = tileStates.detached;
    }

    const Tag = tileState.onClick ? 'a' : 'span';

    return (
      <div
        ref={node => (this.tileNode = node)}
        className={cx('github-PushPull', 'inline-block', {'github-branch-detached': isDetached})}>
        {tileState && (
          [
            <Tag
              onClick={tileState.onClick}
              className="push-pull-target"
              key="push-pull-target">
              {tileState.secondaryText && (
                <span className="secondary">
                  <span className={getIconClass(tileState.secondaryIcon)} />
                  {tileState.secondaryText}
                </span>
              )}
              <span className={getIconClass(tileState.icon, tileState.iconAnimation)} />
              {tileState.text}
            </Tag>,
            this.getTooltip(tileState.tooltip),
          ]
        )}
      </div>
    );
  }
}
