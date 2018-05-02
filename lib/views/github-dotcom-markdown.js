import {CompositeDisposable, Disposable} from 'event-kit';

import React from 'react';
import ReactDom from 'react-dom';
import PropTypes from 'prop-types';

import {handleClickEvent, openIssueishLinkInNewTab, openLinkInBrowser, getDataFromGithubUrl} from './issueish-link';
import UserMentionTooltipItem from '../atom-items/user-mention-tooltip-item';
import IssueishTooltipItem from '../atom-items/issueish-tooltip-item';
import {autobind} from '../helpers';

export default class GithubDotcomMarkdown extends React.Component {
  static propTypes = {
    html: PropTypes.string,
    markdown: PropTypes.string,
    switchToIssueish: PropTypes.func.isRequired,
  }

  static contextTypes = {
    relayEnvironment: PropTypes.object.isRequired,
  }

  constructor(props) {
    super(props);
    autobind(this, 'handleClick', 'openLinkInNewTab', 'openLinkInThisTab', 'openLinkInBrowser');
  }

  componentDidMount() {
    this.commandSubscriptions = atom.commands.add(ReactDom.findDOMNode(this), {
      'github:open-link-in-new-tab': this.openLinkInNewTab,
      'github:open-link-in-browser': this.openLinkInBrowser,
      'github:open-link-in-this-tab': this.openLinkInThisTab,
    });
    this.checkPropValidity();
    this.setupComponentHandlers();
    this.setupTooltipHandlers();
  }

  componentDidUpdate() {
    this.checkPropValidity();
    this.setupTooltipHandlers();
  }

  checkPropValidity() {
    if (this.props.html !== undefined && this.props.markdown !== undefined) {
      // eslint-disable-next-line no-console
      console.error('Only one of `html` or `markdown` may be provided to `GithubDotcomMarkdown`');
    }
  }

  setupComponentHandlers() {
    this.component.addEventListener('click', this.handleClick);
    this.componentHandlers = new Disposable(() => {
      this.component.removeEventListener('click', this.handleClick);
    });
  }

  setupTooltipHandlers() {
    if (this.tooltipSubscriptions) {
      this.tooltipSubscriptions.dispose();
    }

    this.tooltipSubscriptions = new CompositeDisposable();
    this.component.querySelectorAll('.user-mention').forEach(node => {
      const item = new UserMentionTooltipItem(node.textContent, this.context.relayEnvironment);
      this.tooltipSubscriptions.add(atom.tooltips.add(node, {
        trigger: 'hover',
        delay: 0,
        item,
      }));
      this.tooltipSubscriptions.add(new Disposable(() => item.destroy()));
    });
    this.component.querySelectorAll('.issue-link').forEach(node => {
      const item = new IssueishTooltipItem(node.getAttribute('href'), this.context.relayEnvironment);
      this.tooltipSubscriptions.add(atom.tooltips.add(node, {
        trigger: 'hover',
        delay: 0,
        item,
      }));
      this.tooltipSubscriptions.add(new Disposable(() => item.destroy()));
    });
  }

  componentWillUnmount() {
    this.commandSubscriptions.dispose();
    this.componentHandlers.dispose();
    this.tooltipSubscriptions && this.tooltipSubscriptions.dispose();
  }

  render() {
    const {html, markdown} = this.props;
    const renderedHtml = html !== undefined ? html : this.markdownToHtml(markdown);
    return (
      <div
        className="github-DotComMarkdownHtml"
        ref={c => { this.component = c; }}
        dangerouslySetInnerHTML={{__html: renderedHtml}}
      />
    );
  }

  markdownToHtml(markdown = '') {
    return 'WARNING: cannot yet convert markdown to HTML 😅';
  }

  handleClick(event) {
    if (event.target.dataset.url) {
      handleClickEvent(event, event.target.dataset.url);
    }
  }

  openLinkInNewTab(event) {
    return openIssueishLinkInNewTab(event.target.dataset.url);
  }

  openLinkInThisTab(event) {
    const {repoOwner, repoName, issueishNumber} = getDataFromGithubUrl(event.target.dataset.url);
    this.props.switchToIssueish(repoOwner, repoName, issueishNumber);
  }

  openLinkInBrowser(event) {
    return openLinkInBrowser(event.target.getAttribute('href'));
  }
}
