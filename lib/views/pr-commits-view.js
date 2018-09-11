import React from 'react';
import PropTypes from 'prop-types';
import {graphql, createFragmentContainer} from 'react-relay';
import {RelayConnectionPropType} from '../prop-types';

export class PrCommitsView extends React.Component {
  static propTypes = {
    pullRequest: PropTypes.shape({
      commits: RelayConnectionPropType(
        PropTypes.shape({
          commit: PropTypes.shape({
            committer: PropTypes.shape({
              name: PropTypes.string.isRequired,
              date: PropTypes.string.isRequired,
            }),
            message: PropTypes.string.isRequired,
            abbreviatedOid: PropTypes.string.isRequired,
            url: PropTypes.string.isRequired,
          }),
        })
      )
    }),
  }

  render() {
    return ( <div>omg</div>);
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
                name
                date
              }
              message
              abbreviatedOid
              url
            }
          }
        }
      }
    }
  `,
});
