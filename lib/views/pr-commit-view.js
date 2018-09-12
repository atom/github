import React from 'react';
import PropTypes from 'prop-types';
import {emojify} from 'node-emoji';

export default class PrCommitView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {showMessageBody: false};
  }
  handleClick() {
    this.setState({showMessageBody: !this.state.showMessageBody});
  }
  render() {
    return (
      <div className="github-PrCommitView-container">
        <div>
          <b>{emojify(this.props.commit.messageHeadline)}</b>
          {this.props.commit.messageBody ? <button className="github-PrCommitView-btn" onClick={this.handleClick.bind(this)}>show more...</button> : null}
          <div>
            Committed by Tilde Ann Thurium 5 days ago.
          </div>
          {this.state.showMessageBody ? <div><code>{this.props.commit.messageBody}</code></div> : null}
        </div>
        <code><a href={this.props.commit.url} title={`open commit ${this.props.commit.abbreviatedOid} on GitHub.com`}>{this.props.commit.abbreviatedOid}</a></code>
      </div>
    );
  }
}
