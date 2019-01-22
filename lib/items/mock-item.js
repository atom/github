import React, {Fragment} from 'react';
import {Emitter} from 'event-kit';

export default class MockItem extends React.Component {

  static uriPattern = 'atom-github://mock';

  static buildURI() {
    return 'atom-github://mock';
  }

  constructor(props) {
    super(props);
    this.emitter = new Emitter();
    this.title = 'PR #18705';
    this.hasTerminatedPendingState = false;
  }

  render() {
    return (
      <div className="github-Pr">
        {this.renderHeader()}
        {this.renderOverview()}
        {this.renderChanges()}
        {this.renderReviews()}
        {this.renderCommits()}
        {this.renderBuildStatus()}
        {this.renderConversation()}
      </div>
    );
  }

  renderHeader() {
    return (
      <header className="github-PrHeader">
        <button className="github-PrHeader-backButton icon icon-chevron-left">All PRs</button>
        <a className="github-PrHeader-link" title="open on GitHub.com" href="https://github.com/atom/atom/pull/18705">atom/atom<span className="github-PrHeader-id">#18705</span></a>
        <span className="github-PrHeader-refreshButton icon icon-repo-sync"></span>
      </header>
    );
  }

  renderOverview() {
    return (
      <details className="github-Accordion" open>
        <summary className="github-Accordion-header">
          <span className="github-Accordion-headerTitle">Overview</span>
          <span className="github-Accordion-headerControls"><span className="github-IssueishDetailView-headerBadge github-IssueishBadge open"><span className="icon icon-git-pull-request"></span>open</span></span>
        </summary>
        <main className="github-Accordion-content github-Overview">
          <div className="github-Overview-row">
            <a className="github-Overview-title" href="https://github.com/atom/atom/pull/18705">Enable autoFocus option to accept an element to focus on pane creation</a>
          </div>
          <div className="github-Overview-row">
            <label className="github-Overview-label">Branch:</label>
            <code className="github-IssueishDetailView-baseRefName">atom/master</code>
            <span className="github-Overview-branchDirection">‹</span>
            <code className="github-IssueishDetailView-headRefName">shay/autofocus-element</code>
          </div>
          <div className="github-Overview-row">
            <label className="github-Overview-label">Authors:</label>
            <img className="github-Overview-avatar" src="../../github/img/avatars/14.png" />
            <img className="github-Overview-avatar" src="../../github/img/avatars/04.png" />
            </div>
          <div className="github-Overview-row">
            <label className="github-Overview-label">Reviewers:</label>
            <img className="github-Overview-avatar" src="../../github/img/avatars/06.png" />
            <img className="github-Overview-avatar" src="../../github/img/avatars/04.png" />
            <img className="github-Overview-avatar" src="../../github/img/avatars/12.png" />
          </div>
          <div className="github-Overview-row">
            <label className="github-Overview-label">Labels:</label>
            <span className="github-Overview-badge">RFC</span>
            <span className="github-Overview-badge">work-in-progress</span>
          </div>
          <div className="github-Overview-row">
              <button className="github-Overview-checkoutButton btn btn-primary" disabled="true">Checked out</button>
          </div>
        </main>
      </details>
    );
  }

  renderConversation() {
    return (
      <details className="github-Accordion">
        <summary className="github-Accordion-header">
          <span className="github-Accordion-headerTitle">Conversation</span>
          <span className="github-Accordion-headerControls">1 new event</span>
        </summary>
        <main className="github-Accordion-content github-Conversation">
          <div className="github-DotComMarkdownHtml">
            <h3>Identify the Bug</h3>
            <p><span aria-label="This pull request closes issue #18511." className="issue-keyword tooltipped tooltipped-se">fixes</span> <a className="issue-link js-issue-link" data-error-text="Failed to load issue title" data-hovercard-type="issue" data-hovercard-url="/atom/atom/issues/18511/hovercard" data-id="385397392" data-original-title="" data-permission-text="Issue title is private" data-url="https://github.com/atom/atom/issues/18511" href="https://github.com/atom/atom/issues/18511" title="">#18511</a></p>
            <h3>Description of the Change</h3>
            <p>Use <code>panel.autoFocus</code> as the element for <code>focusTrap.initialFocus</code> if it is not a boolean value.</p>
            <h3>Possible Drawbacks</h3>
            <p>None. It is backwards compaitible.</p>
            <h3>Verification Process</h3>
            <p>added a test</p>
            <h3>Release Notes</h3>
            <p>The autoFocus option for panels can now be an element that will receive initial focus.</p>
          </div>

          <div className="github-PrTimeline">
            <div className="issue timeline-item">
              <div className="info-row">
                <span className="icon icon-comment pre-timeline-item-icon"></span><img className="author-avatar" src="../../github/img/avatars/04.png" /><span className="comment-message-header">Finley commented <a href="https://github.com/atom/atom/pull/18603#issuecomment-449605789"><span className="timeago">a month ago</span></a></span>
              </div>
              <div className="github-DotComMarkdownHtml">
                <p>Over in Arch Linux, we've been packaging an unofficial electron 3.x package for the past month. Although it mostly works, we did receive a bug report with a proposed resolution that we've forwarded to <a className="issue-link js-issue-link" data-error-text="Failed to load issue title" data-hovercard-type="pull_request" data-hovercard-url="/atom/tabs/pull/552/hovercard" data-id="393601182" data-original-data-permission-text="Issue title is private" data-url="https://github.com/atom/tabs/issues/552" href="https://github.com/atom/tabs/pull/552">atom/tabs#552</a></p>
              </div>
            </div>
            <div className="issue timeline-item">
              <div className="info-row">
                <span className="icon icon-comment pre-timeline-item-icon"></span><img className="author-avatar" src="../../github/img/avatars/07.png" /><span className="comment-message-header">Kyrie commented <a href="https://github.com/atom/atom/pull/18603#issuecomment-450272856"><span className="timeago">21 days ago</span></a></span>
              </div>
              <div className="github-DotComMarkdownHtml">
                <p>Segmentation fault in <a data-hovercard-type="issue" data-hovercard-url="/atom/atom/issues/18624/hovercard" href="https://github.com/atom/atom/issues/18624">this issue</a>. Looks like somethings been deprecated.</p>
              </div>
            </div>
            <div className="issue timeline-item">
              <div className="info-row">
                <span className="icon icon-comment pre-timeline-item-icon"></span><img className="author-avatar" src="../../github/img/avatars/12.png" /><span className="comment-message-header">Rylan commented <a href="https://github.com/atom/atom/pull/18603#issuecomment-450275837"><span className="timeago">21 days ago</span></a></span>
              </div>
              <div className="github-DotComMarkdownHtml">
                <p>Deprecations have already been fixed in fs-plus 3.1.1, which is in this PR.</p>
              </div>
            </div>
          </div>
        </main>
      </details>
    );
  }

  renderChanges() {
    return (
      <details className="github-Accordion">
        <summary className="github-Accordion-header">
          <span className="github-Accordion-headerTitle">Changes</span>
          <span className="github-Accordion-headerControls">3 files</span>
        </summary>
        <main className="github-Accordion-content github-Changes">
          <div className="github-Changes-item">
            All changes
          </div>
          <div className="github-Changes-item">
            Your changes
          </div>
          <div className="github-Changes-item">
            <span className="github-Changes-path">spec/</span>
            <span className="github-Changes-file">panel-container-element-spec.js</span>
          </div>
          <div className="github-Changes-item">
            <span className="github-Changes-path">src/</span>
            <span className="github-Changes-file">panel-container-element.js</span>
          </div>
          <div className="github-Changes-item">
            <span className="github-Changes-path">src/</span>
            <span className="github-Changes-file">workspace.js</span>
          </div>
        </main>
      </details>
    );
  }

  renderCommits() {
    return (
      <details className="github-Accordion">
        <summary className="github-Accordion-header">
          <span className="github-Accordion-headerTitle">Commits</span>
          <span className="github-Accordion-headerControls">4</span>
        </summary>
        <ul className="github-Accordion-content github-Commits github-RecentCommits-list">
          <li className="github-RecentCommit most-recent">
            <span className="github-RecentCommit-authors"><img className="github-RecentCommit-avatar" src="../../github/img/avatars/14.png" /></span><span className="github-RecentCommit-message" title="handle null or undefined">Handle null or undefined</span>
              <button className="btn github-RecentCommit-undoButton">Undo</button>
              <time className="timeago github-RecentCommit-time" title="Jan 17th, 2019">1d</time>
          </li>
          <li className="github-RecentCommit">
            <span className="github-RecentCommit-authors"><img className="github-RecentCommit-avatar" src="../../github/img/avatars/14.png" /></span><span className="github-RecentCommit-message" title="add test">Add test</span>
              <time className="timeago github-RecentCommit-time" title="Jan 16th, 2019">2d</time>
          </li>
          <li className="github-RecentCommit">
            <span className="github-RecentCommit-authors"><img className="github-RecentCommit-avatar" src="../../github/img/avatars/04.png" /></span><span className="github-RecentCommit-message" title="update documentation">Update documentation</span>
              <time className="timeago github-RecentCommit-time" title="Jan 16th, 2019">2d</time>
          </li>
          <li className="github-RecentCommit">
            <span className="github-RecentCommit-authors"><img className="github-RecentCommit-avatar" src="../../github/img/avatars/14.png" /></span><span className="github-RecentCommit-message" title="allow autoFocus to be used as initialFocus">Allow autoFocus to be used as initialFocus</span>
              <time className="timeago github-RecentCommit-time" title="Nov 29th, 2018">2M</time>
          </li>
        </ul>
      </details>
    );
  }

  renderBuildStatus() {
    return (
      <details className="github-Accordion">
        <summary className="github-Accordion-header">
          <span className="github-Accordion-headerTitle">Build Status</span>
          <span className="github-Accordion-headerControls"><span className="icon icon-check github-PrStatuses--success"></span></span>
        </summary>
        <main className="github-Accordion-content github-PrStatuses">
          <div className="github-PrStatuses-header">
              <div className="github-PrStatuses-donut-chart">
                  <svg>
                      <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" className="donut-ring-success" pathLength="100" stroke-width="3" stroke-dasharray="100 0" stroke-dashoffset="125"></circle>
                  </svg>
              </div>
              <div className="github-PrStatuses-summary">All checks succeeded</div>
          </div>
          <ul className="github-PrStatuses-list">
              <li className="github-PrStatuses-list-item"><span className="github-PrStatuses-list-item-icon"><span className="icon icon-check github-PrStatuses--success"></span></span><span className="github-PrStatuses-list-item-context"><strong>Atom Pull Requests</strong> #20190116.5 succeeded</span><span className="github-PrStatuses-list-item-details-link"><a href="https://github.visualstudio.com/9e67709c-1fe5-47f2-8cf6-4902878a11f5/_build/results?buildId=29108">Details</a></span></li>
              <li className="github-PrStatuses-list-item"><span className="github-PrStatuses-list-item-icon"><span className="icon icon-check github-PrStatuses--success"></span></span><span className="github-PrStatuses-list-item-context"><strong>continuous-integration/appveyor/pr</strong> AppVeyor build succeeded</span><span className="github-PrStatuses-list-item-details-link"><a href="https://ci.appveyor.com/project/Atom/atom/builds/21672498">Details</a></span></li>
              <li className="github-PrStatuses-list-item"><span className="github-PrStatuses-list-item-icon"><span className="icon icon-check github-PrStatuses--success"></span></span><span className="github-PrStatuses-list-item-context"><strong>continuous-integration/travis-ci/pr</strong> The Travis CI build passed</span><span className="github-PrStatuses-list-item-details-link"><a href="https://travis-ci.org/atom/atom/builds/480556608?utm_source=github_status&amp;utm_medium=notification">Details</a></span></li>
          </ul>
        </main>
      </details>
    );
  }

  renderReviews() {
    return (
      <details className="github-Accordion">
        <summary className="github-Accordion-header">
          <span className="github-Accordion-headerTitle">Reviews</span>
          <span className="github-Accordion-headerControls">
            <span className="github-Reviews-count">Resolved <span className="github-Reviews-countNr">3</span> of <span className="github-Reviews-countNr">5</span></span>
            <progress className='github-Reviews-progessBar' value='3' max='5'></progress>
          </span>
        </summary>
        <main className="github-Accordion-content github-Reviews">

          <div className="github-Review">
            <header className="github-Review-header">
              <span className="github-Review-icon icon icon-alert"></span>
              <img className="github-Review-avatar" src="../../github/img/avatars/06.png"/>
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
                  <img className="github-Review-avatar" src="../../github/img/avatars/06.png"/>
                  <span className="github-Review-commentText">Mind adding a space after the comma?</span>
                  <span className="github-Review-timeAgo">4 hours ago</span>
                </div>
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="../../github/img/avatars/14.png"/>
                  <span className="github-Review-commentText">Thanks, right.</span>
                  <span className="github-Review-timeAgo">1 minute ago</span>
                </div>
                <div className="github-Review-reply">
                  <img className="github-Review-avatar" src="../../github/img/avatars/14.png"/>
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
                <label className='github-Review-checkbox input-label'><input className='input-checkbox' type='checkbox'  defaultChecked />Resolved</label>
              </summary>
              <main className="github-Review-comments">
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="../../github/img/avatars/06.png"/>
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
                <label className='github-Review-checkbox input-label'><input className='input-checkbox' type='checkbox' defaultChecked />Resolved</label>
              </summary>
              <main className="github-Review-comments">
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="../../github/img/avatars/06.png"/>
                  <span className="github-Review-commentText">I think we should only release this as a patch.</span>
                  <span className="github-Review-timeAgo">4 days ago</span>
                </div>
              </main>
            </details>

          </div>


          <div className="github-Review">
            <header className="github-Review-header">
              <span className="github-Review-icon icon icon-comment"></span>
              <img className="github-Review-avatar" src="../../github/img/avatars/04.png"/>
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
                  <img className="github-Review-avatar" src="../../github/img/avatars/04.png"/>
                  <span className="github-Review-commentText">Should we fix <code>ABCMeta.__module__</code> to <code>abc</code>?</span>
                  <span className="github-Review-timeAgo">4 hours ago</span>
                </div>
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="../../github/img/avatars/14.png"/>
                  <span className="github-Review-commentText">Actually I am not sure. I think it is important for pickling the metaclass itself. But pickle can already find the correct class at <code>_py_abc.ABCMeta</code>. Also it is informative for a quick check which version is used, the C one or the Python one. So this is up to you.?</span>
                  <span className="github-Review-timeAgo">3 hours ago</span>
                </div>
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="../../github/img/avatars/07.png"/>
                  <span className="github-Review-commentText">If pickle <code>abc.ABCMeta</code> as <code>_py_abc.ABCMeta</code> it will be not unpickleable in <code>3.6</code>. Or in future Python versions if we will decide to remove or rename <code>_py_abc</code>.</span>
                  <span className="github-Review-timeAgo">6 minutes ago</span>
                </div>
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="../../github/img/avatars/04.png"/>
                  <span className="github-Review-commentText">For now we decided that if the active repository is removed from the project, we will set the active repository to be <code>null</code> rather than iterating through the project to find another repository to set as active. We may opt to change this and fall through to another active repository when we have built out more UI to indicate which project folder is the active repository. For now the only indication is the active pane item and since the active pane item no longer belongs to a folder in the project, there is no valid git repo associated with it and we set the active repository to be <code>null</code>.</span>
                  <span className="github-Review-timeAgo">6 minutes ago</span>
                </div>
                <div className="github-Review-reply">
                  <img className="github-Review-avatar" src="../../github/img/avatars/14.png"/>
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
                <label className='github-Review-checkbox input-label'><input className='input-checkbox' type='checkbox' defaultChecked />Resolved</label>
              </summary>
              <main className="github-Review-comments">
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="../../github/img/avatars/04.png"/>
                  <span className="github-Review-commentText">Why not use just a plain 64-bit integer?</span>
                  <span className="github-Review-timeAgo">4 days ago</span>
                </div>
                <div className="github-Review-comment">
                  <img className="github-Review-avatar" src="../../github/img/avatars/14.png"/>
                  <span className="github-Review-commentText">Hm, good point, I was worried about some ORMs that register lots of classes, but I just calculated that it will take million years to reach the maximum value even if 1000 classes are registered every second.</span>
                  <span className="github-Review-timeAgo">4 days ago</span>
                </div>
              </main>
            </details>

          </div>


          <div className="github-Review">
            <header className="github-Review-header">
              <span className="github-Review-icon icon icon-check"></span>
              <img className="github-Review-avatar" src="../../github/img/avatars/12.png"/>
              <span className="github-Review-type">approved these changes <span className="github-Review-timeAgo">4 days ago</span></span>
            </header>
            <div className="github-Review-summary is-approved">
              Looks good! Ship it!
            </div>
          </div>

        </main>
      </details>
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
