import React from 'react';
import PullRequestReviewsContainer from '../containers/pr-reviews-container';
import GithubDotcomMarkdown from './github-dotcom-markdown';
import Timeago from './timeago';

export default class ReviewsView extends React.Component {

  renderReviewSummaries() {
    return (
      <details className="github-Reviews-section" open>
        <summary className="github-Reviews-header">
          <h1 className="github-Reviews-title">Reviews</h1>
        </summary>
        <main className="github-Reviews-container">
          {[1, 2].map(({something}) => (
            <div className="github-ReviewSummary">
              <header className="github-ReviewSummary-header">
                {/* icon-check: approved, icon-comment: commented, icon-alert: requested changes */}
                <span className="github-ReviewSummary-icon icon icon-check" />
                <img className="github-ReviewSummary-avatar" src="https://avatars.githubusercontent.com/u/e?email=vanessayuenn%40github.com&s=32" />
                <a className="github-ReviewSummary-username" href="https://github.com/vanessayuenn">vanessayuenn</a>
                <span className="github-ReviewSummary-type">approved these changes</span>
                <span className="github-ReviewSummary-timeAgo">18 minutes ago</span>
              </header>
              <main className="github-ReviewSummary-comment is-requesting-changes">
                looks good! 🚢
              </main>
            </div>
          ))}
        </main>
      </details>
    );
  }

  renderReviewComments() {
    return (
      <details className="github-Reviews-section" open>
        <summary className="github-Reviews-header">
          <h1 className="github-Reviews-title">Review comments</h1>
          <span className="github-Reviews-progress">
            <span className="github-Reviews-count">Resolved <span className="github-Reviews-countNr">1</span> of <span className="github-Reviews-countNr">7</span></span>
            <progress className="github-Reviews-progessBar" value="1" max="7"></progress>
          </span>
        </summary>
        <main className="github-Reviews-container">
          <ReviewCommentThreadView />
        </main>
      </details>
    );
  }

  render() {
    return (
      <div className="github-Reviews">
        {this.renderReviewSummaries()}
        {this.renderReviewComments()}
        <PullRequestReviewsContainer>
          {_commentThread => this.renderReviewComments()}
        </PullRequestReviewsContainer>
      </div>
    );
  }
}

class ReviewCommentThreadView extends React.Component {
  render() {
    const {comments} = this.props.commentThread;
    const rootComment = comments[0];

    return (
      <details className="github-Review" key={`review-comment-${rootCommentId}`}>
        <summary className="github-Review-reference">
          <span className="github-Review-resolvedIcon icon icon-check" />
          <span className="github-Review-path">lib/controllers/</span>
          <span className="github-Review-file">commit-detail-controller.js</span>
          <span className="github-Review-lineNr">19</span>
          <img className="github-Review-referenceAvatar"
            src={rootComment.author ? rootComment.author.avatarUrl : ''} alt={rootComment.author.login}
          />
          <span className="github-Review-referenceTimeAgo">{rootComment.createdAt}</span>
          <nav className="github-Review-nav">
            <button className="github-Review-navButton icon icon-diff" />
            <button className="github-Review-navButton icon icon-code" onClick={this.didClickLink}
              data-path="lib/controllers/commit-detail-controller.js" data-line="19"
            />
          </nav>
        </summary>
        <pre className="github-Review-diff">
          <div className="github-Review-diffLine            ">{ '      messageCollapsible: this.props.commit.isBodyLong(),' }</div>
          <div className="github-Review-diffLine            ">{ '      messageOpen: !this.props.commit.isBodyLong(),' }</div>
          <div className="github-Review-diffLine is-deleted ">{ '    };' }</div>
          <div className="github-Review-diffLine is-added   ">{ '    }' }</div>
        </pre>

        <main className="github-Review-comments">
          {comments.map(comment => (
            <div className="github-Review-comment" key={comment.id}>
              <header className="github-Review-header">
                <img className="github-Review-avatar"
                  src={comment.author ? comment.author.avatarUrl : ''} alt={comment.author.login}
                />
                <a className="github-Review-username" href="https://github.com/annthurium">{comment.author.login}</a>
                <a className="github-Review-timeAgo" href={comment.url}>
                  <Timeago time={comment.createdAt} />
                </a>
              </header>
              <div className="github-Review-text">
                <GithubDotcomMarkdown html={comment.bodyHTML} />
              </div>
            </div>
          ))}

          <div className="github-Review-reply">
            <textarea className="github-Review-replyInput input-textarea native-key-bindings" placeholder="Reply..." />
            <button className="github-Review-replyButton btn" title="Add your comment">Comment</button>
          </div>
        </main>
        <footer className="github-Review-footer">
          <button className="github-Review-resolveButton btn btn-primary icon icon-check" title="Mark as resolved">
            Mark as resolved
          </button>
        </footer>
      </details>
    );
  }
}
