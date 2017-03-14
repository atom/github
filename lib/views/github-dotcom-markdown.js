import {Disposable} from 'atom';
import {shell} from 'electron';

import url from 'url';

import React from 'react';
import ReactDom from 'react-dom';
import {autobind} from 'core-decorators';

import IssueishPaneItem from '../pane-items/issueish-pane-item';

export default class GithubDotcomMarkdown extends React.Component {
  static propTypes = {
    html: React.PropTypes.string,
    markdown: React.PropTypes.string,
    switchToIssueish: React.PropTypes.func.isRequired,
  }

  componentDidMount() {
    this.subscription = atom.commands.add(ReactDom.findDOMNode(this), {
      'github:open-link-in-new-tab': this.openLinkInNewTab,
      'github:open-link-in-browser': this.openLinkInBrowser,
      'github:open-link-in-this-tab': this.openLinkInThisTab,
    });
    this.checkPropValidity();
    this.setupHandlers();
  }

  componentDidUpdate() {
    this.checkPropValidity();
  }

  checkPropValidity() {
    if (this.props.html && this.props.markdown) {
      // eslint-disable-next-line no-console
      console.error('Only one of `html` or `markdown` may be provided to `GithubDotcomMarkdown`');
    }
  }

  setupHandlers() {
    this.component.addEventListener('click', this.handleClick);
    this.handlers = new Disposable(() => {
      this.component.removeEventListener('click', this.handleClick);
    });
  }

  componentWillUnmount() {
    this.subscription.dispose();
    this.handlers.dispose();
  }

  render() {
    const {html, markdown} = this.props;
    const renderedHtml = html ? html : this.markdownToHtml(markdown);
    return (
      <div
        className="github-DotComMarkdownHtml"
        ref={c => { this.component = c; }}
        dangerouslySetInnerHTML={{__html: renderedHtml}}
      />
    );
  }

  markdownToHtml(markdown = '') {
    return (
      <div>WARNING: cannot yet convert markdown to HTML 😅</div>
    );
  }

  @autobind
  handleClick(event) {
    if (event.target.classList.contains('issue-link')) {
      const uri = this.getAtomUriForGithubUrl(event.target.dataset.url);
      if (uri && !event.shiftKey) {
        // Open in browser if shift key held
        this.openInNewTab(uri, {activate: !(event.metaKey || event.ctrlKey)});
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  @autobind
  openLinkInNewTab(event) {
    const uri = this.getAtomUriForGithubUrl(event.target.dataset.url);
    if (uri) {
      this.openInNewTab(uri);
    }
  }

  @autobind
  openLinkInThisTab(event) {
    const {repoOwner, repoName, issueishNumber} = this.getDataFromGithubUrl(event.target.dataset.url);
    this.props.switchToIssueish(repoOwner, repoName, issueishNumber);
  }

  @autobind
  openLinkInBrowser(event) {
    const href = event.target.getAttribute('href');
    shell.openExternal(href);
  }

  getDataFromGithubUrl(githubUrl) {
    const {hostname, pathname} = url.parse(githubUrl);
    const [repoOwner, repoName, type, issueishNumber] = pathname.split('/').filter(s => s);
    return {hostname, repoOwner, repoName, type, issueishNumber: parseInt(issueishNumber, 10)};
  }

  getUriForData({hostname, repoOwner, repoName, type, issueishNumber}) {
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

  getAtomUriForGithubUrl(githubUrl) {
    return this.getUriForData(this.getDataFromGithubUrl(githubUrl));
  }

  openInNewTab(uri, {activate} = {activate: true}) {
    if (activate) {
      atom.workspace.open(uri, {activateItem: activate});
    } else {
      // TODO: use workspace.open once https://github.com/atom/atom/issues/14005 is fixed
      const item = IssueishPaneItem.opener(uri);
      atom.workspace.getActivePane().addItem(item);
    }
  }
}
