import React from 'react';
import PropTypes from 'prop-types';
import {graphql, createFragmentContainer} from 'react-relay';

import IssueishListView from '../views/issueish-list-view';
import Issueish from '../models/issueish';

const StatePropType = PropTypes.oneOf(['EXPECTED', 'PENDING', 'SUCCESS', 'ERROR', 'FAILURE']);

export class BareIssueishListController extends React.Component {
  static propTypes = {
    results: PropTypes.arrayOf(
      PropTypes.shape({
        number: PropTypes.number.isRequired,
        title: PropTypes.string.isRequired,
        url: PropTypes.string.isRequired,
        author: PropTypes.shape({
          login: PropTypes.string.isRequired,
          avatarUrl: PropTypes.string.isRequired,
        }).isRequired,
        createdAt: PropTypes.string.isRequired,
        headRefName: PropTypes.string.isRequired,
        commits: PropTypes.shape({
          nodes: PropTypes.arrayOf(PropTypes.shape({
            commit: PropTypes.shape({
              status: PropTypes.shape({
                contexts: PropTypes.arrayOf(
                  PropTypes.shape({
                    state: StatePropType.isRequired,
                  }).isRequired,
                ).isRequired,
              }),
            }),
          })),
        }),
      }),
    ),
    total: PropTypes.number.isRequired,
    isLoading: PropTypes.bool.isRequired,
    title: PropTypes.string.isRequired,
    error: PropTypes.object,

    onOpenIssueish: PropTypes.func.isRequired,
    onOpenMore: PropTypes.func,

    emptyComponent: PropTypes.func,
  };

  static defaultProps = {
    results: [],
    total: 0,
  }

  constructor(props) {
    super(props);

    this.state = {};
  }

  static getDerivedStateFromProps(props, state) {
    if (props.results === null) {
      return {
        lastResults: null,
        issueishes: [],
      };
    }

    if (props.results !== state.lastResults) {
      return {
        lastResults: props.results,
        issueishes: props.results.map(node => new Issueish(node)),
      };
    }

    return null;
  }

  render() {
    return (
      <IssueishListView
        title={this.props.title}
        isLoading={this.props.isLoading}
        total={this.props.total}
        issueishes={this.state.issueishes}
        error={this.props.error}

        onIssueishClick={this.props.onOpenIssueish}
        onMoreClick={this.props.onOpenMore}

        emptyComponent={this.props.emptyComponent}
      />
    );
  }
}

export default createFragmentContainer(BareIssueishListController, {
  results: graphql`
    fragment issueishListController_results on PullRequest
    @relay(plural: true)
    {
      number
      title
      url
      author {
        login
        avatarUrl
      }
      createdAt
      headRefName

      commits(last:1) {
        nodes {
          commit {
            status {
              contexts {
                state
              }
            }
          }
        }
      }
    }
  `,
});
