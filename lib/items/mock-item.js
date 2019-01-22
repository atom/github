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
                <span className="github-Review-path">lib/repository-states/</span>
                <span className="github-Review-file">present.js</span>
                <span className="github-Review-line">350</span>
                <label className='github-Review-checkbox input-label'><input className='input-checkbox' type='checkbox' />Resolved</label>
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
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/jonsnow.png"/>
                  <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                  <button className="github-Review-button github-Review-commentButton btn" title="Add your comment">Comment</button>
                </div>
              </main>
            </details>

            <details className="github-Review-thread">
              <summary className="github-Review-threadHeader">
                <span className="github-Review-path">lib/repository-states/</span>
                <span className="github-Review-file">present.js</span>
                <span className="github-Review-line">350</span>
                <label className='github-Review-checkbox input-label'><input className='input-checkbox' type='checkbox'  checked="true" />Resolved</label>
              </summary>
              <main className="github-Review-comments">
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/george.png"/>
                  <span className="github-Review-commentText">Great solution! 🤘</span>
                  <span className="github-Review-timeAgo">3 days ago</span>
                </div>
              </main>
            </details>

            <details className="github-Review-thread">
              <summary className="github-Review-threadHeader">
                <span className="github-Review-path">/</span>
                <span className="github-Review-file">package.json</span>
                <span className="github-Review-line">4</span>
                <label className='github-Review-checkbox input-label'><input className='input-checkbox' type='checkbox' checked="true" />Resolved</label>
              </summary>
              <main className="github-Review-comments">
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/george.png"/>
                  <span className="github-Review-commentText">I think we should only release this as a patch.</span>
                  <span className="github-Review-timeAgo">4 days ago</span>
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
                <span className="github-Review-file">commit-detail-view.js</span>
                <span className="github-Review-line">238</span>
                <label className='github-Review-checkbox input-label'><input className='input-checkbox' type='checkbox' />Resolved</label>
              </summary>
              <main className="github-Review-comments">
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/arya.png"/>
                  <span className="github-Review-commentText">Should we fix <code>ABCMeta.__module__</code> to <code>abc</code>?</span>
                  <span className="github-Review-timeAgo">4 hours ago</span>
                </div>
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/jonsnow.png"/>
                  <span className="github-Review-commentText">Actually I am not sure. I think it is important for pickling the metaclass itself. But pickle can already find the correct class at <code>_py_abc.ABCMeta</code>. Also it is informative for a quick check which version is used, the C one or the Python one. So this is up to you.?</span>
                  <span className="github-Review-timeAgo">3 hours ago</span>
                </div>
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/nina.png"/>
                  <span className="github-Review-commentText">If pickle <code>abc.ABCMeta</code> as <code>_py_abc.ABCMeta</code> it will be not unpickleable in <code>3.6</code>. Or in future Python versions if we will decide to remove or rename <code>_py_abc</code>.</span>
                  <span className="github-Review-timeAgo">6 minutes ago</span>
                </div>
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/arya.png"/>
                  <span className="github-Review-commentText">For now we decided that if the active repository is removed from the project, we will set the active repository to be <code>null</code> rather than iterating through the project to find another repository to set as active. We may opt to change this and fall through to another active repository when we have built out more UI to indicate which project folder is the active repository. For now the only indication is the active pane item and since the active pane item no longer belongs to a folder in the project, there is no valid git repo associated with it and we set the active repository to be <code>null</code>.</span>
                  <span className="github-Review-timeAgo">6 minutes ago</span>
                </div>
                <div className="github-Review-reply">
                  <img className="github-Review-avatar" src="https://api.adorable.io/avatars/285/jonsnow.png"/>
                  <textarea className='github-Review-replyInput input-textarea native-key-bindings' placeholder='Reply...'></textarea>
                  <button className="github-Review-button github-Review-commentButton btn" title="Add your comment">Comment</button>
                </div>
              </main>
            </details>

            <details className="github-Review-thread">
              <summary className="github-Review-threadHeader">
                <span className="github-Review-path">lib/controllers/</span>
                <span className="github-Review-file">commit-detail-controller.js</span>
                <span className="github-Review-line">26</span>
                <label className='github-Review-checkbox input-label'><input className='input-checkbox' type='checkbox' checked="true" />Resolved</label>
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
