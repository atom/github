import React from 'react';
import Relay from 'react-relay';

import Commit from './commit-container';

export class Commits extends React.Component {
  static propTypes = {
    nodes: React.PropTypes.arrayOf(
      React.PropTypes.shape({
        length: React.PropTypes.number,
        author: React.PropTypes.shape({
          user: React.PropTypes.shape({
            login: React.PropTypes.string.isRequired,
          }).isRequired,
        }).isRequired,
      }).isRequired,
    ).isRequired,
  }

  render() {
    return (
      <div>
        {this.renderSummary()}
        {this.renderCommits()}
      </div>
    );
  }

  renderSummary() {
    if (this.props.nodes.length > 1) {
      return <div>{this.props.nodes[0].author.user.login} and others added some commits...</div>;
    } else {
      return null;
    }
  }

  renderCommits() {
    return this.props.nodes.map(node => {
      return <Commit key={node.id} item={node} />;
    });
  }
}


export default Relay.createContainer(Commits, {
  fragments: {
    nodes: () => Relay.QL`
      fragment on Commit @relay(plural: true) {
        id author { user { login } }
        ${Commit.getFragment('item')}
      }
    `,
  },
});
