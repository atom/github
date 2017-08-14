import React from 'react';
import {graphql, createRefetchContainer} from 'react-relay';
import PropTypes from 'prop-types';
import cx from 'classnames';
import {autobind} from 'core-decorators';

import IssueTimelineContainer from './issue-timeline-container';
import PrTimelineContainer from './pr-timeline-container';
import PrStatusesContainer from './pr-statuses-container';
import Octicon from '../views/octicon';
import GithubDotcomMarkdown from '../views/github-dotcom-markdown';
import PeriodicRefresher from '../periodic-refresher';

const reactionTypeToEmoji = {
  THUMBS_UP: '👍',
  THUMBS_DOWN: '👎',
  LAUGH: '😆',
  HOORAY: '🎉',
  CONFUSED: '😕',
  HEART: '❤️',
};

const typeAndStateToIcon = {
  Issue: {
    OPEN: 'issue-opened',
    CLOSED: 'issue-closed',
  },
  PullRequest: {
    OPEN: 'git-pull-request',
    CLOSED: 'git-pull-request',
    MERGED: 'git-merge',
  },
};

export class IssueishPaneItemView extends React.Component {
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
      id: PropTypes.string.isRequired,
      title: PropTypes.string,
      bodyHTML: PropTypes.string,
      number: PropTypes.number,
      state: PropTypes.oneOf([
        'OPEN', 'CLOSED', 'MERGED',
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

  componentDidMount() {
    this.refresher = new PeriodicRefresher(IssueishPaneItemView, {
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

  render() {
    const repo = this.props.repository;
    const issueish = this.props.issueish;
    const icons = typeAndStateToIcon[issueish.__typename] || {};
    const icon = icons[issueish.state] || '';
    const isPr = issueish.__typename === 'PullRequest';
    const childProps = {
      issue: issueish.__typename === 'Issue' ? issueish : null,
      pullRequest: issueish.__typename === 'PullRequest' ? issueish : null,
    };
    return (
      <div className="github-PrPaneItem native-key-bindings">
        <div className="github-PrPaneItem-container">
          <div className="issueish-badge-and-link">
            <span className={cx('issueish-badge', 'badge', issueish.state.toLowerCase())}>
              <Octicon icon={icon} />
              {issueish.state.toLowerCase()}
            </span>
            <span className="issueish-link">
              <a href={issueish.url}>{repo.owner.login}/{repo.name}#{issueish.number}</a>
            </span>
            {isPr && <span className="pr-build-status-icon">
              <PrStatusesContainer pullRequest={issueish} displayType="check" />
            </span>}
            <span className="refresh-button">
              <Octicon
                icon="repo-sync"
                className={cx({refreshing: this.state.refreshing})}
                onClick={this.handleRefreshClick}
              />
            </span>
          </div>
          <div className="issueish-avatar-and-title">
            <a className="author-avatar-link" href={issueish.author.url}>
              <img className="author-avatar" src={issueish.author.avatarUrl} title={issueish.author.login} />
            </a>
            <h3 className="issueish-title">{issueish.title}</h3>
          </div>
          <GithubDotcomMarkdown
            html={issueish.bodyHTML || '<em>No description provided.</em>'}
            switchToIssueish={this.props.switchToIssueish}
          />
          <div className="reactions">
            {issueish.reactionGroups.map(group => (
              group.users.totalCount > 0
              ? <span className={cx('reaction-group', group.content.toLowerCase())} key={group.content}>
                {reactionTypeToEmoji[group.content]} &nbsp; {group.users.totalCount}
              </span>
              : null
            ))}
          </div>
          {isPr ?
            <PrTimelineContainer
              {...childProps}
              switchToIssueish={this.props.switchToIssueish}
            /> :
            <IssueTimelineContainer
              {...childProps}
              switchToIssueish={this.props.switchToIssueish}
            />
          }
          {isPr && <div className="pr-build-statuses">
            <PrStatusesContainer pullRequest={issueish} />
          </div>}
        </div>
      </div>
    );
  }

  @autobind
  handleRefreshClick(e) {
    e.preventDefault();
    this.refresher.refreshNow(true);
  }

  @autobind
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

export default createRefetchContainer(IssueishPaneItemView, {
  repository: graphql`
    fragment IssueishPaneItemContainer_repository on Repository {
      id name owner { login }
    }
  `,

  issueish: graphql`
    fragment IssueishPaneItemContainer_issueish on IssueOrPullRequest {
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

        ...IssueTimelineContainer_issue
      }

      ... on PullRequest {
        ...PrStatusesContainer_pullRequest
        state number title bodyHTML
        author {
          login avatarUrl
          ... on User { url }
          ... on Bot { url }
        }

        ...PrTimelineContainer_pullRequest
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
  query IssueishPaneItemContainerRefetchQuery
  (
    $repoId: ID!, $issueishId: ID!, $timelineCount: Int!, $timelineCursor: String
  ) {
    repository:node(id: $repoId) {
      ...IssueishPaneItemContainer_repository
    }

    issueish:node(id: $issueishId) {
      ...IssueishPaneItemContainer_issueish
    }
  }
`);
