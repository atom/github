import React from 'react';
import {graphql, createFragmentContainer} from 'react-relay/compat';
import PropTypes from 'prop-types';

import Octicon from '../../views/octicon';

export class Commit extends React.Component {
  static propTypes = {
    item: PropTypes.object.isRequired,
  }

  authoredByCommitter(commit) {
    if (commit.authoredByCommitter) {
      return true;
    }
    // If you commit on GitHub online the committer details would be:
    //
    //    name: "GitHub"
    //    email: "noreply@github.com"
    //    user: null
    //
    if (commit.committer.email === 'noreply@github.com') {
      return true;
    }
    if (commit.committer.name === 'GitHub' && commit.committer.user === null) {
      return true;
    }

    return false;
  }

  renderCommitter(commit) {
    if (!this.authoredByCommitter(commit)) {
      return (
        <img
          className="author-avatar" src={commit.committer.avatarUrl}
          title={commit.committer.user ? commit.committer.user.login : commit.committer.name}
        />
      );
    } else {
      return null;
    }
  }
  render() {
    const commit = this.props.item;
    return (
      <div className="commit">
        <Octicon className="pre-timeline-item-icon" icon="git-commit" />
        <span className="commit-author">
          <img
            className="author-avatar" src={commit.author.avatarUrl}
            title={commit.author.user ? commit.author.user.login : commit.author.name}
          />
          {this.renderCommitter(commit)}
        </span>
        <span
          className="commit-message-headline"
          title={commit.message}
          dangerouslySetInnerHTML={{__html: commit.messageHeadlineHTML}}
        />
        <span className="commit-sha">{commit.oid.slice(0, 8)}</span>
      </div>
    );
  }
}

export default createFragmentContainer(Commit, {
  item: graphql`
    fragment CommitContainer_item on Commit {
      author {
        name avatarUrl
        user {
          login
        }
      }
      committer {
        name avatarUrl
        user {
          login
        }
      }
      authoredByCommitter
      oid message messageHeadlineHTML
    }
  `,
});
