import React from 'react';
import PropTypes from 'prop-types';
import {emojify} from 'node-emoji';
import moment from 'moment';

import MultiFilePatchController from './multi-file-patch-controller';

const avatarAltText = 'committer avatar';

export default class CommitDetailController extends React.Component {
  static propTypes = {
    repository: PropTypes.object.isRequired,

    workspace: PropTypes.object.isRequired,
    commands: PropTypes.object.isRequired,
    keymaps: PropTypes.object.isRequired,
    tooltips: PropTypes.object.isRequired,
    config: PropTypes.object.isRequired,

    destroy: PropTypes.func.isRequired,
    commit: PropTypes.object.isRequired,
  }

  render() {
    const commit = this.props.commit;
    // const {messageHeadline, messageBody, abbreviatedOid, url} = this.props.item;
    // const {avatarUrl, name, date} = this.props.item.committer;

    return (
      <div>
        <div className="github-CommitDetailView-commit">
          <h3 className="github-CommitDetailView-title">
            {emojify(commit.getMessageSubject())}
            <pre className="github-CommitDetailView-moreText">
              {emojify(commit.getMessageBody())}</pre>
          </h3>
          <div className="github-CommitDetailView-meta">
            {/* TODO fix image src */}
            <img className="github-CommitDetailView-avatar"
              src="https://avatars.githubusercontent.com/u/e?email=kuychaco%40gmail.com&s=32"
              alt={avatarAltText} title={avatarAltText}
            />
            <span className="github-CommitDetailView-metaText">
              {commit.getAuthorEmail()} committed {this.humanizeTimeSince(commit.getAuthorDate())}
            </span>
          </div>
        </div>
        <div className="github-CommitDetailView-sha">
          {/* TODO fix href */}
          <a href="https://github.com/atom/github/commit/6e0781600cccc3de2cc981f0d43209bf31cf86c8"
            title={`open commit ${commit.getSha()} on GitHub.com`}>
            {commit.getSha()}
          </a>
        </div>
        <MultiFilePatchController
          multiFilePatch={commit.getMultiFileDiff()}
          {...this.props}
        />
      </div>
    );
  }

  humanizeTimeSince(date) {
    return moment(date).fromNow();
  }
}
