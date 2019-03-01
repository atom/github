import React from 'react';
import {Emitter} from 'event-kit';

export default class MockItem extends React.Component {

  static uriPattern = 'atom-github://mock';

  static buildURI() {
    return 'atom-github://mock';
  }

  constructor(props) {
    super(props);
    this.emitter = new Emitter();
    this.title = 'Reviews #1919';
    this.hasTerminatedPendingState = false;
  }

  didClickLink = (evt) => {
    this.props.workspace.open(
      evt.target.dataset.path, {
        initialLine: evt.target.dataset.line - 1,
        initialColumn: 100, // TODO: move cursor to the end of the line (maybe only if not too long???)
        pending: true
    });
  }

  render() {
    return (
      <div className="github-Reviews">
        <header className="github-Reviews-header">
          <h1 className="github-Reviews-title">Reviews</h1>
          <span className="github-Reviews-progress">
            <span className="github-Reviews-count">Resolved <span className="github-Reviews-countNr">1</span> of <span className="github-Reviews-countNr">7</span></span> comments
            <progress class='github-Reviews-progessBar' value='1' max='7'></progress>
          </span>
        </header>
        <main className="github-Reviews-container">

          <div className="github-Review">
            <header className="github-Review-header">
              <span className="github-Review-icon icon icon-alert"></span>
              <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=simurai%40github.com&s=32"/>
              <a className="github-Review-username" href="https://github.com/simurai">simurai</a>
              <span className="github-Review-type">requested changes</span>
              <span className="github-Review-timeAgo">1 hour ago</span>
            </header>

            <div className="github-Review-summary is-requesting-changes">
              This is a great addition. Before merging we might should rethink the position of the icon.
            </div>

            <details className="github-Review-thread">
              <summary className="github-Review-threadHeader">
                <span className="github-Review-resolvedIcon icon icon-check"></span>
                <span className="github-Review-path">lib/views/</span>
                <span className="github-Review-file">file-patch-header-view.js</span>
                <span className="github-Review-lineNr">52</span>
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
                  <header className="github-Review-commentHeader">
                    <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=simurai%40github.com&s=32"/>
                    <a className="github-Review-username" href="https://github.com/simurai">simurai</a>
                    <span className="github-Review-commentTimeAgo">1 hour ago</span>
                  </header>
                  <div className="github-Review-commentText">Should we move the chevron icon to the left? So that the position doesn't jump when there are more buttons. Alternative would be to move it all the way to the right.</div>
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
          </div>

          <div className="github-Review">
            <header className="github-Review-header">
              <span className="github-Review-icon icon icon-comment"></span>
              <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
              <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
              <span className="github-Review-type">left review comments</span>
              <span className="github-Review-timeAgo">2 hour ago</span>
            </header>

            <details className="github-Review-thread">
              <summary className="github-Review-threadHeader">
                <span className="github-Review-resolvedIcon icon icon-check"></span>
                <span className="github-Review-path">lib/models/patch/</span>
                <span className="github-Review-file">builder.js</span>
                <span className="github-Review-lineNr">12</span>
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
                  <header className="github-Review-commentHeader">
                    <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                    <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
                    <span className="github-Review-commentTimeAgo">1 hour ago</span>
                  </header>
                  <div className="github-Review-commentText"><a href="https://github.com/simurai">@simurai</a>: how many lines do you think constitutes a large diff? Not just from a performance perspective, but from a user experience perspective. Like how many lines is disruptive to a user when they're trying to read, because often large diffs are the result of auto generated code.</div>
                </div>
                <div className="github-Review-comment">
                  <header className="github-Review-commentHeader">
                    <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=simurai%40github.com&s=32"/>
                    <a className="github-Review-username" href="https://github.com/simurai">simurai</a>
                    <span className="github-Review-commentTimeAgo">1 hour ago</span>
                  </header>
                  <div className="github-Review-commentText">Hmmm.. will large diffs be collapsed by default or there is a "load" button? Maybe if the diff is so large that it fills the whole scroll height. Then I can uncollapse only if I'm really interested in that file. 100 seems fine. 👍</div>
                </div>
                <div className="github-Review-comment">
                  <header className="github-Review-commentHeader">
                    <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                    <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
                    <span className="github-Review-commentTimeAgo">1 hour ago</span>
                  </header>
                  <div className="github-Review-commentText"><a href="https://github.com/kuychaco">@kuychaco</a> <a href="https://github.com/vanessayuenn">@vanessayuenn</a> <a href="https://github.com/smashwilson">@smashwilson</a> care to weigh in?</div>
                </div>
                <div className="github-Review-comment">
                  <header className="github-Review-commentHeader">
                    <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=vanessayuenn%40github.com&s=32"/>
                    <a className="github-Review-username" href="https://github.com/vanessayuenn">vanessayuenn</a>
                    <span className="github-Review-commentTimeAgo">25 minutes ago</span>
                  </header>
                  <div className="github-Review-commentText">mm we were using 1000 lines as the threshold before, but that's for performance reasons. 100 does seem a bit small though considering it's counting both deleted and added lines. 🤔 <br/>
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

            <details className="github-Review-thread is-resolved">
              <summary className="github-Review-threadHeader">
                <span className="github-Review-resolvedIcon icon icon-check"></span>
                <span className="github-Review-path">lib/models/patch/</span>
                <span className="github-Review-file">file-patch.js</span>
                <span className="github-Review-lineNr">280</span>
                <nav className="github-Review-nav">
                  <button className="github-Review-navButton icon icon-diff"></button>
                  <button className="github-Review-navButton icon icon-code" onClick={this.didClickLink}
                          data-path="lib/models/patch/file-patch.js" data-line="280"></button>
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
                  <header className="github-Review-commentHeader">
                    <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                    <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
                    <span className="github-Review-commentTimeAgo">4 hours ago</span>
                  </header>
                  <div className="github-Review-commentText">nice! This is going to be so useful when we are trying to debug the marker layer on a text buffer.</div>
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

          </div>

          <div className="github-Review">
            <header className="github-Review-header">
              <span className="github-Review-icon icon icon-comment"></span>
              <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
              <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
              <span className="github-Review-type">commented</span>
              <span className="github-Review-timeAgo">4 hours ago</span>
            </header>

            <div className="github-Review-summary is-comment">
              looking good so far -- just found a few nits to address.
            </div>

            <details className="github-Review-thread">
              <summary className="github-Review-threadHeader">
                <span className="github-Review-resolvedIcon icon icon-check"></span>
                <span className="github-Review-path">lib/views/</span>
                <span className="github-Review-file">file-patch-header-view.js</span>
                <span className="github-Review-lineNr">22</span>
                <nav className="github-Review-nav">
                  <button className="github-Review-navButton icon icon-diff"></button>
                  <button className="github-Review-navButton icon icon-code" onClick={this.didClickLink}
                          data-path="lib/views/file-patch-header-view.js" data-line="22"></button>
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
                  <header className="github-Review-commentHeader">
                    <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                    <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
                    <span className="github-Review-commentTimeAgo">4 hours ago</span>
                  </header>
                  <div className="github-Review-commentText">this is a really long name -- can you come up with something more concise?</div>
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

            <details className="github-Review-thread">
              <summary className="github-Review-threadHeader">
                <span className="github-Review-resolvedIcon icon icon-check"></span>
                <span className="github-Review-path">lib/models/patch/</span>
                <span className="github-Review-file">multi-file-patch.js</span>
                <span className="github-Review-lineNr">359</span>
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
                  <header className="github-Review-commentHeader">
                    <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                    <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
                    <span className="github-Review-commentTimeAgo">4 hours ago</span>
                  </header>
                  <div className="github-Review-commentText">same as above - this name is too long and the line length linters are gonna be unhappy.</div>
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

            <details className="github-Review-thread">
              <summary className="github-Review-threadHeader">
                <span className="github-Review-resolvedIcon icon icon-check"></span>
                <span className="github-Review-path">test/views/</span>
                <span className="github-Review-file">pr-comments-view.test.js</span>
                <span className="github-Review-lineNr">17</span>
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
                  <header className="github-Review-commentHeader">
                    <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                    <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
                    <span className="github-Review-commentTimeAgo">4 hours ago</span>
                  </header>
                  <div className="github-Review-commentText">again, this variable name is too long</div>
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

            <details className="github-Review-thread">
              <summary className="github-Review-threadHeader">
                <span className="github-Review-resolvedIcon icon icon-check"></span>
                <span className="github-Review-path">lib/controllers/</span>
                <span className="github-Review-file">commit-detail-controller.js</span>
                <span className="github-Review-lineNr">19</span>
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
                  <header className="github-Review-commentHeader">
                    <img className="github-Review-avatar" src="https://avatars.githubusercontent.com/u/e?email=annthurium%40github.com&s=32"/>
                    <a className="github-Review-username" href="https://github.com/annthurium">annthurium</a>
                    <span className="github-Review-commentTimeAgo">4 hours ago</span>
                  </header>
                  <div className="github-Review-commentText">mind adding the missing semicolon here?</div>
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


          </div>

        </main>
      </div>


    );
  }

  destroy = () => {
    /* istanbul ignore else */
    if (!this.isDestroyed) {
      this.emitter.emit('did-destroy');
      this.isDestroyed = true;
    }
  }

  onDidDestroy(callback) {
    return this.emitter.on('did-destroy', callback);
  }

  serialize() {
    return {
      uri: this.getURI(),
      deserializer: 'MockItem',
    };
  }

  getTitle() {
    return this.title;
  }

  onDidChangeTitle(cb) {
    return this.emitter.on('did-change-title', cb);
  }

}
