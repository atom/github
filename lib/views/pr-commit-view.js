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
        <div>
          <b>{emojify(this.props.messageHeadline)}</b>
          {this.props.messageBody ?
            <button
              className="github-PrCommitView-btn"
              onClick={this.toggleShowCommitMessageBody}>
              {this.state.showMessageBody ? 'hide' : 'show'} more...
            </button>
            : null}
          <div>
            <img className="github-PrCommitView-avatar"
              src={this.props.committerAvatarUrl}
              alt={'commiter avatar'} title={'committer avatar'}
            />
            <span className="github-PrCommitView-text">
              committed by {this.props.committerName}{this.humanizeTimeSince(this.props.date)}
            </span>
          </div>
          {this.state.showMessageBody ? <div><code>{emojify(this.props.messageBody)}</code></div> : null}
        </div>
        <code>
          <a href={this.props.url}
            title={`open commit ${this.props.abbreviatedOid} on GitHub.com`}>
            {this.props.abbreviatedOid}
          </a>
        </code>
      </div>
    );
  }
}
