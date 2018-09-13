import React from 'react';
import PropTypes from 'prop-types';
import {emojify} from 'node-emoji';
import moment from 'moment';

import {autobind} from '../helpers';

export default class PrCommitView extends React.Component {
  static propTypes = {
    committerAvatarUrl: PropTypes.string.isRequired,
    committerName: PropTypes.string.isRequired,
    date: PropTypes.string.isRequired,
    messageBody: PropTypes.string,
    messageHeadline: PropTypes.string.isRequired,
    abbreviatedOid: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {showMessageBody: false};
    autobind(this, 'toggleShowCommitMessageBody', 'humanizeTimeSince');
  }

  toggleShowCommitMessageBody() {
    this.setState({showMessageBody: !this.state.showMessageBody});
  }

  humanizeTimeSince(date) {
    return moment(date).fromNow();
  }

  render() {
    return (
      <div className="github-PrCommitView-container">
        <div className="github-PrCommitView-commit">
          <h3 className="github-PrCommitView-title">
            {emojify(this.props.messageHeadline)}
            {this.props.messageBody ?
              <button
                className="github-PrCommitView-moreButton icon icon-ellipsis"
                onClick={this.toggleShowCommitMessageBody}>
              </button>
            : null}
          </h3>
          <div className="github-PrCommitView-meta">
            <img className="github-PrCommitView-avatar"
              src={this.props.committerAvatarUrl}
              alt={'commiter avatar'} title={'committer avatar'}
            />
            <span className="github-PrCommitView-metaText">
              {this.props.committerName} committed {this.humanizeTimeSince(this.props.date)}
            </span>
          </div>
          {this.state.showMessageBody ? <pre className="github-PrCommitView-moreText">
            {emojify(this.props.messageBody)}</pre> : null}
        </div>
        <div className="github-PrCommitView-sha">
          <a href={this.props.url}
            title={`open commit ${this.props.abbreviatedOid} on GitHub.com`}>
            {this.props.abbreviatedOid}
          </a>
        </div>
      </div>
    );
  }
}
