import {CompositeDisposable, Disposable} from 'event-kit';

import React from 'react';
import ReactDom from 'react-dom';
import PropTypes from 'prop-types';

import {handleClickEvent, openIssueishLinkInNewTab, openLinkInBrowser, getDataFromGithubUrl} from './issueish-link';
import UserMentionTooltipItem from '../items/user-mention-tooltip-item';
import IssueishTooltipItem from '../items/issueish-tooltip-item';
import RelayEnvironment from './relay-environment';
import {autobind} from '../helpers';

export class BareGithubDotcomMarkdown extends React.Component {
  static propTypes = {
    relayEnvironment: PropTypes.object.isRequired,
    html: PropTypes.string.isRequired,
    switchToIssueish: PropTypes.func.isRequired,
    handleClickEvent: PropTypes.func,
    openIssueishLinkInNewTab: PropTypes.func,
    openLinkInBrowser: PropTypes.func,
  }

  static defaultProps = {
    handleClickEvent,
    openIssueishLinkInNewTab,
    openLinkInBrowser,
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
    this.setupComponentHandlers();
    this.setupTooltipHandlers();
  }

  componentDidUpdate() {
    this.setupTooltipHandlers();
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
      const item = new UserMentionTooltipItem(node.textContent, this.props.relayEnvironment);
      this.tooltipSubscriptions.add(atom.tooltips.add(node, {
        trigger: 'hover',
        delay: 0,
        class: 'github-Popover',
        item,
      }));
      this.tooltipSubscriptions.add(new Disposable(() => item.destroy()));
    });
    this.component.querySelectorAll('.issue-link').forEach(node => {
      const item = new IssueishTooltipItem(node.getAttribute('href'), this.props.relayEnvironment);
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
    return (
      <div
        className="github-DotComMarkdownHtml"
        ref={c => { this.component = c; }}
        dangerouslySetInnerHTML={{__html: this.props.html}}
      />
    );
  }

  handleClick(event) {
    if (event.target.dataset.url) {
      this.props.handleClickEvent(event, event.target.dataset.url);
    }
  }

  openLinkInNewTab(event) {
    return this.props.openIssueishLinkInNewTab(event.target.dataset.url);
  }

  openLinkInThisTab(event) {
    const {repoOwner, repoName, issueishNumber} = getDataFromGithubUrl(event.target.dataset.url);
    this.props.switchToIssueish(repoOwner, repoName, issueishNumber);
  }

  openLinkInBrowser(event) {
    return this.props.openLinkInBrowser(event.target.getAttribute('href'));
  }
}

export default class GithubDotcomMarkdown extends React.Component {
  render() {
    return (
      <RelayEnvironment.Consumer>
        {relayEnvironment => <BareGithubDotcomMarkdown relayEnvironment={relayEnvironment} {...this.props} />}
      </RelayEnvironment.Consumer>
    );
  }
}
