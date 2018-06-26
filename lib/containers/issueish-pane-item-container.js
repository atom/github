import React from 'react';
import {graphql, createRefetchContainer} from 'react-relay';
import PropTypes from 'prop-types';
import cx from 'classnames';

import IssueTimelineContainer from './issue-timeline-container';
import PrTimelineContainer from './pr-timeline-container';
import PrStatusesContainer from './pr-statuses-container';
import Octicon from '../atom/octicon';
import IssueishBadge from '../views/issueish-badge';
import GithubDotcomMarkdown from '../views/github-dotcom-markdown';
import PeriodicRefresher from '../periodic-refresher';
import {autobind} from '../helpers';

const reactionTypeToEmoji = {
  THUMBS_UP: '👍',
  THUMBS_DOWN: '👎',
  LAUGH: '😆',
  HOORAY: '🎉',
  CONFUSED: '😕',
  HEART: '❤️',
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

  constructor(props) {
    super(props);
    autobind(this, 'handleRefreshClick', 'refresh');
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
    const isPr = issueish.__typename === 'PullRequest';
    const childProps = {
      issue: issueish.__typename === 'Issue' ? issueish : null,
      pullRequest: issueish.__typename === 'PullRequest' ? issueish : null,
    };
    return (
      <div className="github-IssueishPaneItemView native-key-bindings">
        <div className="github-IssueishPaneItemView-container">

          <header className="github-IssueishPaneItemView-header">
            <div className="github-IssueishPaneItemView-headerGroup">
              <IssueishBadge className="github-IssueishPaneItemView-headerBadge"
                type={issueish.__typename}
                state={issueish.state}
              />
              <a className="github-IssueishPaneItemView-headerLink"
                href={issueish.url}>{repo.owner.login}/{repo.name}#{issueish.number}
              </a>
              {isPr && <span className="github-IssueishPaneItemView-headerStatus">
                <PrStatusesContainer pullRequest={issueish} displayType="check" />
              </span>}
            </div>
            <div className="github-IssueishPaneItemView-headerGroup">
              <Octicon
                icon="repo-sync"
                className={cx('github-IssueishPaneItemView-headerRefreshButton', {refreshing: this.state.refreshing})}
                onClick={this.handleRefreshClick}
              />
            </div>
            <div className="github-IssueishPaneItemView-headerGroup is-fullWidth">
              <a className="github-IssueishPaneItemView-avatar" href={issueish.author.url}>
                <img className="github-IssueishPaneItemView-avatarImage"
                  src={issueish.author.avatarUrl}
                  title={issueish.author.login}
                />
              </a>
              <h3 className="github-IssueishPaneItemView-title">{issueish.title}</h3>
            </div>
          </header>

          <GithubDotcomMarkdown
            html={issueish.bodyHTML || '<em>No description provided.</em>'}
            switchToIssueish={this.props.switchToIssueish}
          />

          <div className="github-IssueishPaneItemView-reactions">
            {issueish.reactionGroups.map(group => (
              group.users.totalCount > 0
                ? <span className={cx('github-IssueishPaneItemView-reactionsGroup', group.content.toLowerCase())} key={group.content}>
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

          {isPr && <div className="github-IssueishPaneItemView-buildStatus">
            <PrStatusesContainer pullRequest={issueish} />
          </div>}

        </div>
      </div>
    );
  }

  handleRefreshClick(e) {
    e.preventDefault();
    this.refresher.refreshNow(true);
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

export default createRefetchContainer(IssueishPaneItemView, {
  repository: graphql`
    fragment issueishPaneItemContainer_repository on Repository {
      id name owner { login }
    }
  `,

  issueish: graphql`
    fragment issueishPaneItemContainer_issueish on IssueOrPullRequest {
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

        ...issueTimelineContainer_issue
      }

      ... on PullRequest {
        ...prStatusesContainer_pullRequest
        state number title bodyHTML
        author {
          login avatarUrl
          ... on User { url }
          ... on Bot { url }
        }

        ...prTimelineContainer_pullRequest
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
  query issueishPaneItemContainerRefetchQuery
  (
    $repoId: ID!, $issueishId: ID!, $timelineCount: Int!, $timelineCursor: String
  ) {
    repository:node(id: $repoId) {
      ...issueishPaneItemContainer_repository
    }

    issueish:node(id: $issueishId) {
      ...issueishPaneItemContainer_issueish
    }
  }
`);
