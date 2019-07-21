import React, {Fragment, useRef} from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

import {RemotePropType, BranchPropType} from '../prop-types';
import {useAtomEnv} from '../context/atom';
import Tooltip from '../atom/tooltip';
import RefHolder from '../models/ref-holder';

export default function PushPullView({
  currentBranch,
  currentRemote,
  isSyncing,
  isFetching,
  isPulling,
  isPushing,
  behindCount,
  aheadCount,
  push,
  pull,
  fetch,
  originExists,
}) {
  const atomEnv = useAtomEnv();
  const refTileNode = useRef(new RefHolder());

  function onClickPush(clickEvent) {
    if (isSyncing) {
      return;
    }
    push({
      force: clickEvent.metaKey || clickEvent.ctrlKey,
      setUpstream: !currentRemote.isPresent(),
    });
  }

  function onClickPull(clickEvent) {
    if (isSyncing) {
      return;
    }
    pull();
  }

  function onClickPushPull(clickEvent) {
    if (isSyncing) {
      return;
    }
    if (clickEvent.metaKey || clickEvent.ctrlKey) {
      push({force: true});
    } else {
      pull();
    }
  }

  function onClickPublish(clickEvent) {
    if (isSyncing) {
      return;
    }
    push({setUpstream: !currentRemote.isPresent()});
  }

  function onClickFetch(clickEvent) {
    if (isSyncing) {
      return;
    }
    fetch();
  }

  function getIconClass(icon, animation) {
    return cx(
      'github-PushPull-icon',
      'icon',
      `icon-${icon}`,
      {[`animate-${animation}`]: !!animation},
    );
  }

  function getTileStates() {
    const modKey = process.platform === 'darwin' ? 'Cmd' : 'Ctrl';
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
        onClick: onClickPush,
        tooltip: `Click to push<br />${modKey}-click to force push<br />Right-click for more`,
        icon: 'arrow-up',
        text: `Push ${aheadCount}`,
      },
      behind: {
        onClick: onClickPull,
        tooltip: 'Click to pull<br />Right-click for more',
        icon: 'arrow-down',
        text: `Pull ${behindCount}`,
      },
      aheadBehind: {
        onClick: onClickPushPull,
        tooltip: `Click to pull<br />${modKey}-click to force push<br />Right-click for more`,
        icon: 'arrow-down',
        text: `Pull ${behindCount}`,
        secondaryIcon: 'arrow-up',
        secondaryText: `${aheadCount} `,
      },
      published: {
        onClick: onClickFetch,
        tooltip: 'Click to fetch<br />Right-click for more',
        icon: 'sync',
        text: 'Fetch',
      },
      unpublished: {
        onClick: onClickPublish,
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

  const isAhead = aheadCount > 0;
  const isBehind = behindCount > 0;
  const isUnpublished = !currentRemote.isPresent();
  const isDetached = currentBranch.isDetached();
  const hasOrigin = !!originExists;

  const tileStates = getTileStates();

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

  return (
    <div
      onClick={tileState.onClick}
      ref={refTileNode.current.setter}
      className={cx('github-PushPull', 'inline-block', {'github-branch-detached': isDetached})}>
      {tileState && (
        <Fragment>
          <span>
            {tileState.secondaryText && (
              <span className="secondary">
                <span className={getIconClass(tileState.secondaryIcon)} />
                {tileState.secondaryText}
              </span>
            )}
            <span className={getIconClass(tileState.icon, tileState.iconAnimation)} />
            {tileState.text}
          </span>
          <Tooltip
            key="tooltip"
            target={refTileNode.current}
            title={`<div style="text-align: left; line-height: 1.2em;">${tileState.tooltip}</div>`}
            showDelay={atomEnv.tooltips.hoverDefaults.delay.show}
            hideDelay={atomEnv.tooltips.hoverDefaults.delay.hide}
          />
        </Fragment>
      )}
    </div>
  );
}

PushPullView.propTypes = {
  currentBranch: BranchPropType.isRequired,
  currentRemote: RemotePropType.isRequired,
  isSyncing: PropTypes.bool.isRequired,
  isFetching: PropTypes.bool.isRequired,
  isPulling: PropTypes.bool.isRequired,
  isPushing: PropTypes.bool.isRequired,
  behindCount: PropTypes.number.isRequired,
  aheadCount: PropTypes.number.isRequired,
  push: PropTypes.func.isRequired,
  pull: PropTypes.func.isRequired,
  fetch: PropTypes.func.isRequired,
  originExists: PropTypes.bool.isRequired,
};
