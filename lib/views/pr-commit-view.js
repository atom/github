import React from 'react';
import PropTypes from 'prop-types';
import {emojify} from 'node-emoji';
import moment from 'moment';

import {autobind} from '../helpers';

export default class PrCommitView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {showMessageBody: false};
    autobind(this, 'handleClick', 'humanizeTimeSince');
  }

  handleClick() {
    this.setState({showMessageBody: !this.state.showMessageBody});
  }

  humanizeTimeSince(date) {
    return moment(date).fromNow();
  }

  render() {
    return (
      <div className="github-PrCommitView-container">
        <div>
          <b>{emojify(this.props.commit.messageHeadline)}</b>
          {this.props.commit.messageBody ? <button className="github-PrCommitView-btn" onClick={this.handleClick}>show more...</button> : null}
          <div>
          <img className="github-PrCommitView-avatar" src={this.props.commit.committer.avatarUrl}
            alt={'commiter avatar'} title={'committer avatar'}
          />
            <span className="github-PrCommitView-text">committed by {this.props.commit.committer.name} {this.humanizeTimeSince(this.props.commit.committer.date)}</span>
          </div>
          {this.state.showMessageBody ? <div><code>{emojify(this.props.commit.messageBody)}</code></div> : null}
        </div>
        <code><a href={this.props.commit.url} title={`open commit ${this.props.commit.abbreviatedOid} on GitHub.com`}>{this.props.commit.abbreviatedOid}</a></code>
      </div>
    );
  }
}
