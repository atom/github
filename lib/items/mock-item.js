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
    this.title = 'Reviews #1715';
    this.hasTerminatedPendingState = false;
  }

  didClickLink = (evt) => {
    this.props.workspace.open(evt.target.innerText);
  }

  render() {
    return (
      <div className="github-Reviews">
        <header className="github-Reviews-header">
          <h1 className="github-Reviews-title">Reviews</h1>
          <span className="github-Reviews-progress">
            <span className="github-Reviews-count">Resolved <span className="github-Reviews-countNr">3</span> of <span className="github-Reviews-countNr">5</span></span>
            <progress class='github-Reviews-progessBar' value='3' max='5'></progress>
          </span>
        </header>
        <main className="github-Reviews-container">


          <div className="github-Review">
            <header className="github-Review-header">
              <span className="github-Review-icon icon icon-alert"></span>
              <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/george.png"/>
              <span className="github-Review-type">recommended changes <span className="github-Review-timeAgo">2 days ago</span></span>
            </header>

            <div className="github-Review-summary is-requesting-changes">
              I have a minor suggestion, otherwise this seems good to merge.
            </div>

            <details className="github-Review-thread" open>
              <summary className="github-Review-threadHeader">
                <span className="github-Review-file" onClick={this.didClickLink}>lib/models/repository-states/present.js</span>
                <span className="github-Review-line">350</span>
              </summary>
              <main className="github-Review-comments">
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/george.png"/>
                  <span className="github-Review-commentText">Mind adding a space after the comma?</span>
                  <span className="github-Review-timeAgo">4 hours ago</span>
                </div>
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/jonsnow.png"/>
                  <span className="github-Review-commentText">Thanks, right.</span>
                  <span className="github-Review-timeAgo">1 minute ago</span>
                </div>
                <div className="github-Review-reply">
                  <img className="github-Review-avatar" src="../../github/img/avatars/14.png"/>
                  <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                </div>
                <div className="github-Review-actions">
                  <button className="github-Review-commentButton btn" title="Add your comment">Comment</button>
                  <button className="github-Review-commentButton btn btn-primary icon icon-check" title="Mark this comment as resolved">Mark as resolved</button>
                </div>
              </main>
            </details>

            <details className="github-Review-thread">
              <summary className="github-Review-threadHeader">
                <span className="github-Review-path">lib/models/repository-states/</span>
                <span className="github-Review-file">present.js</span>
                <span className="github-Review-line">420</span>
              </summary>
              <main className="github-Review-comments">
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/george.png"/>
                  <span className="github-Review-commentText">Great solution! 🤘</span>
                  <span className="github-Review-timeAgo">3 days ago</span>
                </div>
                <div className="github-Review-reply">
                  <img className="github-Review-avatar" src="../../github/img/avatars/14.png"/>
                  <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                </div>
                <div className="github-Review-actions">
                  <button className="github-Review-commentButton btn" title="Add your comment">Comment</button>
                  <button className="github-Review-commentButton btn btn-primary icon icon-check" title="Mark this comment as resolved">Mark as resolved</button>
                </div>
              </main>
            </details>

            <details className="github-Review-thread">
              <summary className="github-Review-threadHeader">
                <span className="github-Review-path">/</span>
                <span className="github-Review-file">package.json</span>
                <span className="github-Review-line">4</span>
              </summary>
              <main className="github-Review-comments">
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/george.png"/>
                  <span className="github-Review-commentText">I think we should only release this as a patch.</span>
                  <span className="github-Review-timeAgo">4 days ago</span>
                </div>
                <div className="github-Review-actions">
                  <span className="github-Review-infoText">This comment is resolved</span>
                  <button className="github-Review-commentButton btn" title="Mark this comment as unresolved">Mark as unresolved</button>
                </div>
              </main>
            </details>

          </div>


          <div className="github-Review">
            <header className="github-Review-header">
              <span className="github-Review-icon icon icon-comment"></span>
              <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/arya.png"/>
              <span className="github-Review-type">left review comments <span className="github-Review-timeAgo">2 days ago</span></span>
            </header>

            <details className="github-Review-thread" open>
              <summary className="github-Review-threadHeader">
                <span className="github-Review-path">lib/views/</span>
                <span onClick={this.didClickLink} className="github-Review-file">lib/containers/issueish-detail-container.js</span>
                <span className="github-Review-line">238</span>
              </summary>
              <main className="github-Review-comments">
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/arya.png"/>
                  <span className="github-Review-commentText">Do we know how this effects our rate-limit overhead? The way that GraphQL queries are rate-limited is a bit unexpected. Individual calls cannot request more than 500,000 total nodes.

                  I would guess that we could drop the review and review comment page sizes to drop our computed node total without impacting the vast majority of review scenarios.

                  Maybe @telliott27 has some idea of the distribution of number of reviews and number of comments within a review and could help us find a lower limit that would still capture ~70% or ~80% of requests in a single page... ?</span>
                  <span className="github-Review-timeAgo">4 hours ago</span>
                </div>
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/jonsnow.png"/>
                  <span className="github-Review-commentText">I pulled some distribution stats for number of reviews and number of review comments here: https://ghe.io/telliott27/reports/tree/master/Notebooks/PR%20Review%20Comments#pr-reviews-and-comments-percentiles

                  The TL;DR is that it is rare for a PR to have more than 10 reviews, and for reviews to have more than 10 comments.</span>
                  <span className="github-Review-timeAgo">3 hours ago</span>
                </div>
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/nina.png"/>
                  <span className="github-Review-commentText">Is there a large pull request with many comments we can test on?  I'm still worried about performance.</span>
                  <span className="github-Review-timeAgo">6 minutes ago</span>
                </div>
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/arya.png"/>
                  <span className="github-Review-commentText">For now we decided that if the active repository is removed from the project, we will set the active repository to be <code>null</code> rather than iterating through the project to find another repository to set as active. We may opt to change this and fall through to another active repository when we have built out more UI to indicate which project folder is the active repository. For now the only indication is the active pane item and since the active pane item no longer belongs to a folder in the project, there is no valid git repo associated with it and we set the active repository to be <code>null</code>.</span>
                  <span className="github-Review-timeAgo">6 minutes ago</span>
                </div>
                <div className="github-Review-reply">
                  <img className="github-Review-avatar" src="../../github/img/avatars/14.png"/>
                  <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                </div>
                <div className="github-Review-actions">
                  <button className="github-Review-commentButton btn" title="Add your comment">Comment</button>
                  <button className="github-Review-commentButton btn btn-primary icon icon-check" title="Mark this comment as resolved">Mark as resolved</button>
                </div>
              </main>
            </details>

            <details className="github-Review-thread">
              <summary className="github-Review-threadHeader">
                <span className="github-Review-file" onClick={this.didClickLink}>lib/controllers/commit-detail-controller.js</span>
                <span className="github-Review-line">26</span>
              </summary>
              <main className="github-Review-comments">
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/arya.png"/>
                  <span className="github-Review-commentText">Why not use just a plain 64-bit integer?</span>
                  <span className="github-Review-timeAgo">4 days ago</span>
                </div>
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/jonsnow.png"/>
                  <span className="github-Review-commentText">Hm, good point, I was worried about some ORMs that register lots of classes, but I just calculated that it will take million years to reach the maximum value even if 1000 classes are registered every second.</span>
                  <span className="github-Review-timeAgo">4 days ago</span>
                </div>
                <div className="github-Review-reply">
                  <img className="github-Review-avatar" src="../../github/img/avatars/14.png"/>
                  <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                </div>
                <div className="github-Review-actions">
                  <button className="github-Review-commentButton btn" title="Add your comment">Comment</button>
                  <button className="github-Review-commentButton btn btn-primary icon icon-check" title="Mark this comment as resolved">Mark as resolved</button>
                </div>
              </main>
            </details>

          </div>


          <div className="github-Review">
            <header className="github-Review-header">
              <span className="github-Review-icon icon icon-check"></span>
              <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/nina.png"/>
              <span className="github-Review-type">approved these changes <span className="github-Review-timeAgo">4 days ago</span></span>
            </header>
            <div className="github-Review-summary is-approved">
              Looks good! Ship it!
            </div>
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
