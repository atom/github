import url from 'url';
import {shell} from 'electron';

import React from 'react';
import PropTypes from 'prop-types';

import IssueishPaneItem from '../atom-items/issueish-pane-item';

// eslint-disable-next-line no-shadow
export default function IssueishLink({url, children, ...others}) {
  function clickHandler(event) {
    handleClickEvent(event, url);
  }

  return <a {...others} onClick={clickHandler}>{children}</a>;
}

IssueishLink.propTypes = {
  url: PropTypes.string.isRequired,
  children: PropTypes.element,
};


// eslint-disable-next-line no-shadow
export function handleClickEvent(event, url) {
  if (!event.shiftKey) {
    event.preventDefault();
    event.stopPropagation();
    openIssueishLinkInNewTab(url, {activate: !(event.metaKey || event.ctrlKey)});
  } else {
    // Open in browser if shift key held
    openLinkInBrowser(url);
  }
}

// eslint-disable-next-line no-shadow
export function openIssueishLinkInNewTab(url, options = {}) {
  const uri = getAtomUriForGithubUrl(url);
  if (uri) {
    openInNewTab(uri, options);
  }
}

export function openLinkInBrowser(uri) {
  shell.openExternal(uri);
}

function getAtomUriForGithubUrl(githubUrl) {
  return getUriForData(getDataFromGithubUrl(githubUrl));
}

export function getDataFromGithubUrl(githubUrl) {
  const {hostname, pathname} = url.parse(githubUrl);
  const [repoOwner, repoName, type, issueishNumber] = pathname.split('/').filter(s => s);
  return {hostname, repoOwner, repoName, type, issueishNumber: parseInt(issueishNumber, 10)};
}

function getUriForData({hostname, repoOwner, repoName, type, issueishNumber}) {
  if (hostname !== 'github.com' || !['pull', 'issues'].includes(type) || !issueishNumber || isNaN(issueishNumber)) {
    return null;
  } else {
    return url.format({
      slashes: true,
      protocol: 'atom-github:',
      hostname: 'issueish',
      pathname: `/https://api.github.com/${repoOwner}/${repoName}/${issueishNumber}`,
    });
  }
}

function openInNewTab(uri, {activate} = {activate: true}) {
  if (activate) {
    atom.workspace.open(uri, {activateItem: activate});
  } else {
    // TODO: use workspace.open once https://github.com/atom/atom/issues/14005 is fixed
    const item = IssueishPaneItem.opener(uri);
    atom.workspace.getActivePane().addItem(item);
  }
}
