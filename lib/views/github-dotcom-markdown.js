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
  }

  componentDidMount() {
    this.subscription = atom.commands.add(ReactDom.findDOMNode(this), {
      'github:open-link-in-new-tab': this.openLinkInNewTab,
      'github:open-link-in-browser': this.openLinkInBrowser,
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
      const uri = this.getDataFromUri(event.target.dataset.url);
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
    const uri = this.getDataFromUri(event.target.dataset.url);
    if (uri) {
      this.openInNewTab(uri);
    }
  }

  @autobind
  openLinkInBrowser(event) {
    const href = event.target.getAttribute('href');
    shell.openExternal(href);
  }

  getDataFromUri(uri = '') {
    const {hostname, pathname} = url.parse(uri);
    const [owner, repo, type, issueishNum] = pathname.split('/').filter(s => s);
    if (hostname !== 'github.com' || !(type === 'pull' || type === 'issues') || !issueishNum) {
      return null;
    } else {
      return url.format({
        slashes: true,
        protocol: 'atom-github:',
        hostname: 'issueish',
        pathname: `/https://api.github.com/${owner}/${repo}/${issueishNum}`,
      });
    }
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
