import React, {Fragment} from 'react';
import {graphql, createRefetchContainer} from 'react-relay';
import PropTypes from 'prop-types';
import cx from 'classnames';

import IssueTimelineController from '../controllers/issue-timeline-controller';
import Octicon from '../atom/octicon';
import IssueishBadge from '../views/issueish-badge';
import GithubDotcomMarkdown from '../views/github-dotcom-markdown';
import EmojiReactionsView from '../views/emoji-reactions-view';
import PeriodicRefresher from '../periodic-refresher';
import {autobind} from '../helpers';
import {addEvent} from '../reporter-proxy';

export class BareIssueDetailView extends React.Component {
  static propTypes = {
    relay: PropTypes.shape({
      refetch: PropTypes.func.isRequired,
    }),
    switchToIssueish: PropTypes.func.isRequired,
    repository: PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      owner: PropTypes.shape({
        login: PropTypes.string,
      }),
    }),
    issueish: PropTypes.shape({
      __typename: PropTypes.string.isRequired,
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      url: PropTypes.string.isRequired,
      bodyHTML: PropTypes.string,
      number: PropTypes.number,
      state: PropTypes.oneOf([
        'OPEN', 'CLOSED',
      ]).isRequired,
      author: PropTypes.shape({
        login: PropTypes.string.isRequired,
        avatarUrl: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired,
      }).isRequired,
      reactionGroups: PropTypes.arrayOf(
        PropTypes.shape({
          content: PropTypes.string.isRequired,
          users: PropTypes.shape({
            totalCount: PropTypes.number.isRequired,
          }).isRequired,
        }),
      ).isRequired,
    }).isRequired,
  }

  state = {
    refreshing: false,
  }

  constructor(props) {
    super(props);
    autobind(this, 'handleRefreshClick', 'refresh', 'renderIssueBody', 'recordOpenInBrowserEvent');
  }

  componentDidMount() {
    this.refresher = new PeriodicRefresher(BareIssueDetailView, {
      interval: () => 5 * 60 * 1000,
      getCurrentId: () => this.props.issueish.id,
      refresh: this.refresh,
      minimumIntervalPerId: 2 * 60 * 1000,
    });
    // auto-refresh disabled for now until pagination is handled
    // this.refresher.start();
  }

  componentWillUnmount() {
    this.refresher.destroy();
  }

  renderIssueBody(issueish, childProps) {
    return (
      <Fragment>
        <GithubDotcomMarkdown
          html={issueish.bodyHTML || '<em>No description provided.</em>'}
          switchToIssueish={this.props.switchToIssueish}
        />
        <EmojiReactionsView reactionGroups={issueish.reactionGroups} />
        <IssueTimelineController
          {...childProps}
          switchToIssueish={this.props.switchToIssueish}
        />
      </Fragment>
    );
  }

  render() {
    const repo = this.props.repository;
    const issueish = this.props.issueish;
    const childProps = {
      issue: issueish.__typename === 'Issue' ? issueish : null,
      pullRequest: issueish.__typename === 'PullRequest' ? issueish : null,
    };
    return (
      <div className="github-IssueishDetailView native-key-bindings">
        <div className="github-IssueishDetailView-container">

          <header className="github-IssueishDetailView-header">
            <div className="github-IssueishDetailView-headerRow">
              <div className="github-IssueishDetailView-headerGroup">
                <a className="github-IssueishDetailView-avatar" href={issueish.author.url}>
                  <img className="github-IssueishDetailView-avatarImage"
                    src={issueish.author.avatarUrl}
                    title={issueish.author.login}
                    alt={issueish.author.login}
                  />
                </a>
                <a className="github-IssueishDetailView-title" href={issueish.url}>{issueish.title}</a>
              </div>
              <div className="github-IssueishDetailView-headerGroup">
                <Octicon
                  icon="repo-sync"
                  className={cx('github-IssueishDetailView-headerRefreshButton', {refreshing: this.state.refreshing})}
                  onClick={this.handleRefreshClick}
                />
              </div>
            </div>
            <div className="github-IssueishDetailView-headerRow">
              <div className="github-IssueishDetailView-headerGroup">
                <IssueishBadge className="github-IssueishDetailView-headerBadge"
                  type={issueish.__typename}
                  state={issueish.state}
                />
                <a className="github-IssueishDetailView-headerLink"
                  title="open on GitHub.com"
                  href={issueish.url} onClick={this.recordOpenInBrowserEvent}>
                  {repo.owner.login}/{repo.name}#{issueish.number}
                </a>
              </div>
            </div>
          </header>
          {this.renderIssueBody(issueish, childProps)}

          <footer className="github-IssueishDetailView-footer">
            <a className="github-IssueishDetailView-footerLink icon icon-mark-github"
              href={issueish.url}>{repo.owner.login}/{repo.name}#{issueish.number}
            </a>
          </footer>

        </div>
      </div>
    );
  }

  handleRefreshClick(e) {
    e.preventDefault();
    this.refresher.refreshNow(true);
  }

  recordOpenInBrowserEvent() {
    addEvent('open-issueish-in-browser', {package: 'github', component: this.constructor.name});
  }

  refresh() {
    if (this.state.refreshing) {
      return;
    }

    this.setState({refreshing: true});
    this.props.relay.refetch({
      repoId: this.props.repository.id,
      issueishId: this.props.issueish.id,
      timelineCount: 100,
      timelineCursor: null,
    }, null, () => {
      this.setState({refreshing: false});
    }, {force: true});
  }
}

export default createRefetchContainer(BareIssueDetailView, {
  repository: graphql`
    fragment issueDetailView_repository on Repository {
      id
      name
      owner {
        login
      }
    }
  `,

  issueish: graphql`
    fragment issueDetailView_issueish on Issue
    @argumentDefinitions(
      timelineCount: {type: "Int!"},
      timelineCursor: {type: "String"},
    ) {
      __typename

      ... on Node {
        id
      }

      ... on Issue {
        state number title bodyHTML
        author {
          login avatarUrl
          ... on User { url }
          ... on Bot { url }
        }

        ...issueTimelineController_issue @arguments(timelineCount: $timelineCount, timelineCursor: $timelineCursor)
      }

      ... on UniformResourceLocatable { url }

      ... on Reactable {
        reactionGroups {
          content users { totalCount }
        }
      }
    }
  `,
}, graphql`
  query issueDetailViewRefetchQuery
  (
    $repoId: ID!,
    $issueishId: ID!,
    $timelineCount: Int!,
    $timelineCursor: String,
  ) {
    repository:node(id: $repoId) {
      ...issueDetailView_repository @arguments(
        timelineCount: $timelineCount,
        timelineCursor: $timelineCursor
      )
    }

    issueish:node(id: $issueishId) {
      ...issueDetailView_issueish @arguments(
        timelineCount: $timelineCount,
        timelineCursor: $timelineCursor,
      )
    }
  }
`);
