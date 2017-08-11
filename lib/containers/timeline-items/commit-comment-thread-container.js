import React from 'react';
import Relay from 'react-relay';
import PropTypes from 'prop-types';

import CommitComment from './commit-comment-container';

export class CommitCommentThread extends React.Component {
  static propTypes = {
    item: PropTypes.shape({
      commit: PropTypes.shape({
        oid: PropTypes.string.isRequired,
      }).isRequired,
      comments: PropTypes.shape({
        edges: PropTypes.arrayOf(
          PropTypes.shape({
            node: PropTypes.object.isRequired,
          }).isRequired,
        ).isRequired,
      }).isRequired,
    }).isRequired,
    switchToIssueish: PropTypes.func.isRequired,
  }

  render() {
    const {item} = this.props;
    return (
      <div className="commit-comment-thread timeline-item">
        {item.comments.edges.map((edge, i) => (
          <CommitComment
            isReply={i !== 0}
            key={edge.node.id}
            item={edge.node}
            switchToIssueish={this.props.switchToIssueish}
          />
        ))}
      </div>
    );
  }
}


export default Relay.createContainer(CommitCommentThread, {
  fragments: {
    item: () => Relay.QL`
      fragment on CommitCommentThread {
        commit { oid }
        comments(first: 100) {
          edges {
            node {
              id
              ${CommitComment.getFragment('item')}
            }
          }
        }
      }
    `,
  },
});
