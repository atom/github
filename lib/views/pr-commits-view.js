import React from 'react';
import PropTypes from 'prop-types';
import {graphql, createFragmentContainer} from 'react-relay';
import {RelayConnectionPropType} from '../prop-types';
import PrCommitView from './pr-commit-view';

export class PrCommitsView extends React.Component {
  static propTypes = {
    pullRequest: PropTypes.shape({
      commits: RelayConnectionPropType(
        PropTypes.shape({
          commit: PropTypes.shape({
            committer: PropTypes.shape({
              avatarUrl: PropTypes.string.isRequired,
              name: PropTypes.string.isRequired,
              date: PropTypes.string.isRequired,
            }),
            messageBody: PropTypes.string,
            messageHeadline: PropTypes.string.isRequired,
            abbreviatedOid: PropTypes.string.isRequired,
            url: PropTypes.string.isRequired,
          }),
        }),
      ),
    }),
  }

  render() {
    return this.props.pullRequest.commits.edges.map(edge => {
      const commit = edge.node.commit;
      return (
        <PrCommitView
          key={commit.abbreviatedOid}
          committerAvatarUrl={commit.committer.avatarUrl}
          date={commit.committer.date}
          messageBody={commit.messageBody}
          messageHeadline={commit.messageHeadline}
          abbreviatedOid={commit.abbreviatedOid}
          url={commit.committer.url}
          committerName={commit.committer.name}
        />);
    });
  }
}

export default createFragmentContainer(PrCommitsView, {
  pullRequest: graphql`
    fragment prCommitsView_pullRequest on PullRequest {
      commits(last:100) {
        edges {
          node {
            commit {
              committer {
                avatarUrl
                name
                date
              }
              messageHeadline
              messageBody
              abbreviatedOid
              url
            }
          }
        }
      }
    }
  `,
});
