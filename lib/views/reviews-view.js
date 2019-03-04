import React from 'react';
import {inspect} from 'util';

export default class ReviewsView extends React.Component {

  renderReviewSummaries() {
    return (
      <details className="github-Reviews-section" open>
        <summary className="github-Reviews-header">
          <h1 className="github-Reviews-title">Reviews</h1>
        </summary>
        <main className="github-Reviews-container">
          {[1,2].map(({something}) => (
            <div className="github-ReviewSummary">
              <header className="github-ReviewSummary-header">
              {/*icon-check: approved, icon-comment: commented, icon-alert: requested changes */}
                <span className="github-ReviewSummary-icon icon icon-check" />
                <img className="github-ReviewSummary-avatar" src="https://avatars.githubusercontent.com/u/e?email=vanessayuenn%40github.com&s=32"/>
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
            <progress className='github-Reviews-progessBar' value='1' max='7'></progress>
          </span>
        </summary>
        <main className="github-Reviews-container">

          <details className="github-Review">
            <summary className="github-Review-reference">
              <span className="github-Review-resolvedIcon icon icon-check"></span>
              <span className="github-Review-path">lib/controllers/</span>
              <span className="github-Review-file">commit-detail-controller.js</span>
              <span className="github-Review-lineNr">19</span>
              <img className="github-Review-referenceAvatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
              <span className="github-Review-referenceTimeAgo">4h</span>
              <nav className="github-Review-nav">
                <button className="github-Review-navButton icon icon-diff"></button>
                <button className="github-Review-navButton icon icon-code" onClick={this.didClickLink}
                        data-path="lib/controllers/commit-detail-controller.js" data-line="19"></button>
              </nav>
            </summary>
            <pre className="github-Review-diff">
              <div className="github-Review-diffLine            ">{ '      messageCollapsible: this.props.commit.isBodyLong(),' }</div>
              <div className="github-Review-diffLine            ">{ '      messageOpen: !this.props.commit.isBodyLong(),' }</div>
              <div className="github-Review-diffLine is-deleted ">{ '    };' }</div>
              <div className="github-Review-diffLine is-added   ">{ '    }' }</div>
            </pre>
            <main className="github-Review-comments">
              <div className="github-Review-comment">
                <header className="github-Review-header">
                  <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                  <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
                  <span className="github-Review-timeAgo">4 hours ago</span>
                </header>
                <div className="github-Review-text">mind adding the missing semicolon here?</div>
              </div>

              <div className="github-Review-reply">
                <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                <button className="github-Review-replyButton btn" title="Add your comment">Comment</button>
              </div>
            </main>
            <footer className="github-Review-footer">
              <button className="github-Review-resolveButton btn btn-primary icon icon-check" title="Mark this comment as resolved">Mark as resolved</button>
            </footer>
          </details>

          <details className="github-Review">
            <summary className="github-Review-reference">
              <span className="github-Review-resolvedIcon icon icon-check"></span>
              <span className="github-Review-path">lib/controllers/</span>
              <span className="github-Review-file">pr-reviews-controller.js</span>
              <span className="github-Review-lineNr">22</span>
              <img className="github-Review-referenceAvatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
              <span className="github-Review-referenceTimeAgo">4h</span>
              <nav className="github-Review-nav">
                <button className="github-Review-navButton icon icon-diff"></button>
                <button className="github-Review-navButton icon icon-code" onClick={this.didClickLink}
                        data-path="lib/controllers/pr-reviews-controller.js" data-line="22"></button>
              </nav>
            </summary>
            <pre className="github-Review-diff">
              <div className="github-Review-diffLine         ">{ '      ),' }</div>
              <div className="github-Review-diffLine         ">{ '    }),' }</div>
              <div className="github-Review-diffLine         ">{ '    getBufferRowForDiffPosition: PropTypes.func.isRequired,' }</div>
              <div className="github-Review-diffLine is-added">{ '    isPatchTooLargeOrCollapsed: PropTypes.func.isRequired,' }</div>
            </pre>
            <main className="github-Review-comments">
              <div className="github-Review-comment">
                <header className="github-Review-header">
                  <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                  <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
                  <span className="github-Review-timeAgo">4 hours ago</span>
                </header>
                <div className="github-Review-text">this is a really long name -- can you come up with something more concise?</div>
              </div>
              <div className="github-Review-comment">
                <header className="github-Review-header">
                  <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=vanessayuenn%40github.com&s=32"/>
                  <a className="github-Review-username" href="https://github.com/vanessayuenn">vanessayuenn</a>
                  <span className="github-Review-timeAgo">18 minutes ago</span>
                </header>
                <div className="github-Review-text">how about just <code>isPatchCollapsed</code>?</div>
              </div>

              <div className="github-Review-reply">
                <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                <button className="github-Review-replyButton btn" title="Add your comment">Comment</button>
              </div>
            </main>
            <footer className="github-Review-footer">
              <button className="github-Review-resolveButton btn btn-primary icon icon-check" title="Mark this comment as resolved">Mark as resolved</button>
            </footer>
          </details>

          <details className="github-Review">
            <summary className="github-Review-reference">
              <span className="github-Review-resolvedIcon icon icon-check"></span>
              <span className="github-Review-path">lib/models/patch/</span>
              <span className="github-Review-file">builder.js</span>
              <span className="github-Review-lineNr">12</span>
              <img className="github-Review-referenceAvatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
              <span className="github-Review-referenceTimeAgo">1h</span>
              <nav className="github-Review-nav">
                <button className="github-Review-navButton icon icon-diff"></button>
                <button className="github-Review-navButton icon icon-code" onClick={this.didClickLink}
                        data-path="lib/models/patch/builder.js" data-line="12"></button>
              </nav>
            </summary>
            <pre className="github-Review-diff">
              <div className="github-Review-diffLine is-added">{ 'export const DEFAULT_OPTIONS = {' }</div>
              <div className="github-Review-diffLine is-added">{ '  // Number of lines after which we consider the diff "large"' }</div>
              <div className="github-Review-diffLine is-added">{ '  // TODO: Set this based on performance measurements' }</div>
              <div className="github-Review-diffLine is-added">{ '  largeDiffThreshold: 100,' }</div>
            </pre>
            <main className="github-Review-comments">
              <div className="github-Review-comment">
                <header className="github-Review-header">
                  <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                  <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
                  <span className="github-Review-timeAgo">1 hour ago</span>
                </header>
                <div className="github-Review-text"><a href="https://github.com/simurai">@simurai</a>: how many lines do you think constitutes a large diff? Not just from a performance perspective, but from a user experience perspective. Like how many lines is disruptive to a user when they're trying to read, because often large diffs are the result of auto generated code.</div>
              </div>
              <div className="github-Review-comment">
                <header className="github-Review-header">
                  <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=simurai%40github.com&s=32"/>
                  <a className="github-Review-username" href="https://github.com/simurai">simurai</a>
                  <span className="github-Review-timeAgo">1 hour ago</span>
                </header>
                <div className="github-Review-text">Hmmm.. will large diffs be collapsed by default or there is a "load" button? Maybe if the diff is so large that it fills the whole scroll height. Then I can uncollapse only if I'm really interested in that file. 100 seems fine. 👍</div>
              </div>
              <div className="github-Review-comment">
                <header className="github-Review-header">
                  <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                  <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
                  <span className="github-Review-timeAgo">1 hour ago</span>
                </header>
                <div className="github-Review-text"><a href="https://github.com/kuychaco">@kuychaco</a> <a href="https://github.com/vanessayuenn">@vanessayuenn</a> <a href="https://github.com/smashwilson">@smashwilson</a> care to weigh in?</div>
              </div>
              <div className="github-Review-comment">
                <header className="github-Review-header">
                  <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=vanessayuenn%40github.com&s=32"/>
                  <a className="github-Review-username" href="https://github.com/vanessayuenn">vanessayuenn</a>
                  <span className="github-Review-timeAgo">25 minutes ago</span>
                </header>
                <div className="github-Review-text">mm we were using 1000 lines as the threshold before, but that's for performance reasons. 100 does seem a bit small though considering it's counting both deleted and added lines. 🤔 <br/>
                <br/>
                300 seems a bit more reasonable, but still an arbitrary number.</div>
              </div>

              <div className="github-Review-reply">
                <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                <button className="github-Review-replyButton btn" title="Add your comment">Comment</button>
              </div>
            </main>
            <footer className="github-Review-footer">
              <button className="github-Review-resolveButton btn btn-primary icon icon-check" title="Mark this comment as resolved">Mark as resolved</button>
            </footer>
          </details>

          <details className="github-Review">
            <summary className="github-Review-reference">
              <span className="github-Review-resolvedIcon icon icon-check"></span>
              <span className="github-Review-path">lib/models/patch/</span>
              <span className="github-Review-file">multi-file-patch.js</span>
              <span className="github-Review-lineNr">359</span>
              <img className="github-Review-referenceAvatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
              <span className="github-Review-referenceTimeAgo">4h</span>
              <nav className="github-Review-nav">
                <button className="github-Review-navButton icon icon-diff"></button>
                <button className="github-Review-navButton icon icon-code" onClick={this.didClickLink}
                        data-path="lib/models/patch/multi-file-patch.js" data-line="359"></button>
              </nav>
            </summary>
            <pre className="github-Review-diff">
              <div className="github-Review-diffLine is-added">{ '    }' }</div>
              <div className="github-Review-diffLine is-added">{ '  }' }</div>
              <div className="github-Review-diffLine is-added">{ '' }</div>
              <div className="github-Review-diffLine is-added">{ '  isPatchTooLargeOrCollapsed = filePatchPath => {' }</div>
            </pre>
            <main className="github-Review-comments">
              <div className="github-Review-comment">
                <header className="github-Review-header">
                  <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                  <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
                  <span className="github-Review-timeAgo">4 hours ago</span>
                </header>
                <div className="github-Review-text">same as above - this name is too long and the line length linters are gonna be unhappy.</div>
              </div>

              <div className="github-Review-reply">
                <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                <button className="github-Review-replyButton btn" title="Add your comment">Comment</button>
              </div>
            </main>
            <footer className="github-Review-footer">
              <button className="github-Review-resolveButton btn btn-primary icon icon-check" title="Mark this comment as resolved">Mark as resolved</button>
            </footer>
          </details>

          <details className="github-Review">
            <summary className="github-Review-reference">
              <span className="github-Review-resolvedIcon icon icon-check"></span>
              <span className="github-Review-path">lib/views/</span>
              <span className="github-Review-file">file-patch-header-view.js</span>
              <span className="github-Review-lineNr">52</span>
              <img className="github-Review-referenceAvatar" src="https://avatars.githubusercontent.com/u/e?email=simurai%40github.com&s=32"/>
              <span className="github-Review-referenceTimeAgo">2h</span>
              <nav className="github-Review-nav">
                <button className="github-Review-navButton icon icon-diff"></button>
                <button className="github-Review-navButton icon icon-code" onClick={this.didClickLink}
                        data-path="lib/views/file-patch-header-view.js" data-line="52"></button>
              </nav>
            </summary>
            <pre className="github-Review-diff">
              <div className="github-Review-diffLine         ">{ '      <header className="github-FilePatchView-header">' }</div>
              <div className="github-Review-diffLine         ">{ '        <span className="github-FilePatchView-title">' }</div>
              <div className="github-Review-diffLine         ">{ '          {this.renderTitle()}' }</div>
              <div className="github-Review-diffLine is-added">{ '          {this.renderCollapseButton()}' }</div>
            </pre>
            <main className="github-Review-comments">
              <div className="github-Review-comment">
                <header className="github-Review-header">
                  <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=simurai%40github.com&s=32"/>
                  <a className="github-Review-username" href="https://github.com/simurai">simurai</a>
                  <span className="github-Review-timeAgo">2 hours ago</span>
                </header>
                <div className="github-Review-text">Should we move the chevron icon to the left? So that the position doesn't jump when there are more buttons. Alternative would be to move it all the way to the right.</div>
              </div>

              <div className="github-Review-reply">
                <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                <button className="github-Review-replyButton btn" title="Add your comment">Comment</button>
              </div>
            </main>
            <footer className="github-Review-footer">
              <button className="github-Review-resolveButton btn btn-primary icon icon-check" title="Mark this comment as resolved">Mark as resolved</button>
            </footer>
          </details>

          <details className="github-Review">
            <summary className="github-Review-reference">
              <span className="github-Review-resolvedIcon icon icon-check"></span>
              <span className="github-Review-path">test/views/</span>
              <span className="github-Review-file">pr-comments-view.test.js</span>
              <span className="github-Review-lineNr">17</span>
              <img className="github-Review-referenceAvatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
              <span className="github-Review-referenceTimeAgo">4h</span>
              <nav className="github-Review-nav">
                <button className="github-Review-navButton icon icon-diff"></button>
                <button className="github-Review-navButton icon icon-code" onClick={this.didClickLink}
                        data-path="test/views/pr-comments-view.test.js" data-line="17"></button>
              </nav>
            </summary>
            <pre className="github-Review-diff">
              <div className="github-Review-diffLine is-added">{ '    };' }</div>
              <div className="github-Review-diffLine is-added">{ '    return shallow(' }</div>
              <div className="github-Review-diffLine is-added">{ '      <PullRequestCommentsView' }</div>
              <div className="github-Review-diffLine is-added">{ '        isPatchTooLargeOrCollapsed={sinon.stub().returns(false)}' }</div>
            </pre>
            <main className="github-Review-comments">
              <div className="github-Review-comment">
                <header className="github-Review-header">
                  <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                  <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
                  <span className="github-Review-timeAgo">4 hours ago</span>
                </header>
                <div className="github-Review-text">again, this variable name is too long</div>
              </div>

              <div className="github-Review-reply">
                <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                <button className="github-Review-replyButton btn" title="Add your comment">Comment</button>
              </div>
            </main>
            <footer className="github-Review-footer">
              <button className="github-Review-resolveButton btn btn-primary icon icon-check" title="Mark this comment as resolved">Mark as resolved</button>
            </footer>
          </details>

          <details className="github-Review is-resolved">
            <summary className="github-Review-reference">
              <span className="github-Review-resolvedIcon icon icon-check"></span>
              <span className="github-Review-path">lib/models/patch/</span>
              <span className="github-Review-file">builder.js</span>
              <span className="github-Review-lineNr">280</span>
              <img className="github-Review-referenceAvatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
              <span className="github-Review-referenceTimeAgo">4h</span>
              <nav className="github-Review-nav">
                <button className="github-Review-navButton icon icon-diff"></button>
                <button className="github-Review-navButton icon icon-code" onClick={this.didClickLink}
                        data-path="lib/models/patch/builder.js" data-line="280"></button>
              </nav>
            </summary>
            <pre className="github-Review-diff">
              <div className="github-Review-diffLine is-added">{ '  /*' }</div>
              <div className="github-Review-diffLine is-added">{ '   * Construct a String containing diagnostic information about the internal state of this FilePatch.' }</div>
              <div className="github-Review-diffLine is-added">{ '   */' }</div>
              <div className="github-Review-diffLine is-added">{ '  inspect(opts = {}) {' }</div>
            </pre>
            <main className="github-Review-comments">
              <div className="github-Review-comment">
                <header className="github-Review-header">
                  <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                  <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
                  <span className="github-Review-timeAgo">4 hours ago</span>
                </header>
                <div className="github-Review-text">nice! This is going to be so useful when we are trying to debug the marker layer on a text buffer.</div>
              </div>

              <div className="github-Review-reply">
                <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                <button className="github-Review-replyButton btn" title="Add your comment">Comment</button>
              </div>
            </main>
            <footer className="github-Review-footer">
              <span className="github-Review-resolveText"><a href="https://github.com/annthurium">annthurium</a> marked this as resolved</span>
              <button className="github-Review-resolveButton btn" title="Mark this comment as unresolved">Mark as unresolved</button>
            </footer>
          </details>

        </main>
      </details>
    )
  }

  render() {
    return (
      <div className="github-Reviews">
        {this.renderReviewSummaries()}
        {this.renderReviewComments()}
      </div>
    );
  }
}
