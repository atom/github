import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay/compat';
import PropTypes from 'prop-types';

import CommitCommentContainer from './commit-comment-container';

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
          <CommitCommentContainer
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


export default createFragmentContainer(CommitCommentThread, {
  item: graphql`
    fragment CommitCommentThreadContainer_item on CommitCommentThread {
      commit { oid }
      comments(first: 100) {
        edges {
          node {
            id
            ...CommitCommentContainer_item
          }
        }
      }
    }
  `,
});
