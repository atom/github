import {Disposable} from 'event-kit';

import React, {Fragment} from 'react';
import ReactDom from 'react-dom';
import PropTypes from 'prop-types';

import {handleClickEvent, openIssueishLinkInNewTab, openLinkInBrowser, getDataFromGithubUrl} from './issueish-link';
import UserMentionTooltipItem from '../items/user-mention-tooltip-item';
import IssueishTooltipItem from '../items/issueish-tooltip-item';
import RelayEnvironmentContext from '../relay-environment-context';
import {autobind} from '../helpers';
import Tooltip from '../atom/tooltip';
import RefHolder from '../models/ref-holder';

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

  state = { mentions: [], issueLinks: [] }

  componentDidMount() {
    this.commandSubscriptions = atom.commands.add(ReactDom.findDOMNode(this), {
      'github:open-link-in-new-tab': this.openLinkInNewTab,
      'github:open-link-in-browser': this.openLinkInBrowser,
      'github:open-link-in-this-tab': this.openLinkInThisTab,
    });
    this.setupComponentHandlers();
  }

  setupComponentHandlers() {
    this.component.addEventListener('click', this.handleClick);
    this.componentHandlers = new Disposable(() => {
      this.component.removeEventListener('click', this.handleClick);
    });
  }

  /**
   * TODO: Maybe don't re-query on every change, and instead incrementally
   * update based on the handy record we receive?
   * 
   * @param {MutationRecord} _record
   */
  domDidChange = _record =>
    this.setState({
      mentions: [...this.component.querySelectorAll('.user-mention')],
      issueLinks: [...this.component.querySelectorAll('.issue-link')],
    })

  observer = new MutationObserver(this.domDidChange)  
  
  setRoot = div => {    
    this.component = div
    this.observer.disconnect()
    if (!div) return
    this.observer.observe(div, { childList: true, subtree: true })    
    this.domDidChange()
  }  
  

  componentWillUnmount() {
    this.commandSubscriptions.dispose();
    this.componentHandlers.dispose();
  }

  render() {
    return (
      <Fragment>
        <div
          className="github-DotComMarkdownHtml"
          ref={this.setRoot}
          dangerouslySetInnerHTML={{__html: this.props.html}}
        />
        {
          this.state.mentions.map(m =>
            <Tooltip className='github-Popover' showDelay={0} manager={atom.tooltips} target={RefHolder.constant(m)}>
              <UserMentionTooltipItem username={m.textContent.slice(1)} />
            </Tooltip>
          )
        }
        {
          this.state.issueLinks.map(a =>
            <Tooltip className='github-Popover' showDelay={0} manager={atom.tooltips} target={RefHolder.constant(a)}>
              <IssueishTooltipItem issueishUrl={a.href} />
            </Tooltip>
          )
        }
      </Fragment>
    );
  }

  handleClick(event) {
    if (event.target.dataset.url) {
      return this.props.handleClickEvent(event, event.target.dataset.url);
    } else {
      return null;
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
      <RelayEnvironmentContext.Consumer>{
        relayEnvironment => relayEnvironment && <BareGithubDotcomMarkdown relayEnvironment={relayEnvironment} {...this.props} />
      }</RelayEnvironmentContext.Consumer>
    );
  }
}
