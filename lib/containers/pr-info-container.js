import React from 'react';
import Relay from 'react-relay';

class PrInfo extends React.Component {
  static propTypes = {
    branchName: React.PropTypes.string.isRequired,
    query: React.PropTypes.shape({
      repository: React.PropTypes.object.isRequired,
    }),
  }

  render() {
    const repo = this.props.query.repository;
    if (!repo.ref || !repo.ref.associatedPullRequests || !repo.ref.associatedPullRequests.edges.length) {
      return <div>No PR for {this.props.branchName}</div>;
    }
    const pr = this.props.query.repository.ref.associatedPullRequests.edges[0].node;

    return (
      <div style={{padding: '0 20px', maxWidth: 400, overflow: 'scroll'}}>
        <h3>{pr.title}<span style={{color: 'gray'}}> {repo.name}/{repo.owner.login}#{pr.number}</span></h3>
        <div><img src={pr.author.avatarURL} style={{maxWidth: 20, display: 'inline-block'}} /> {pr.author.login}</div>
        <div dangerouslySetInnerHTML={{__html: pr.bodyHTML}} />
      </div>
    );
  }
}

export default Relay.createContainer(PrInfo, {
  initialVariables: {
    repoOwner: null,
    repoName: null,
    branchName: null,
  },

  fragments: {
    query: () => Relay.QL`
      fragment on Query {
        repository(owner: $repoOwner name: $repoName) {
          owner { login } name
          ref(qualifiedName: $branchName) {
            associatedPullRequests(last: 1) {
              edges {
                node {
                  number title author { login avatarURL } bodyHTML
                }
              }
            }
          }
        }
      }
    `,
  },
});
