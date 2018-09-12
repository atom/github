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
          {emojify(this.props.commit.messageHeadline)}
          {this.props.commit.messageBody ? <button onClick={this.handleClick.bind(this)}>...</button> : null}
          {this.state.showMessageBody ? <div><code>{this.props.commit.messageBody}</code></div> : null}
        </div>
        <code><a href={this.props.commit.url} title={`open commit ${this.props.commit.abbreviatedOid} on GitHub.com`}>{this.props.commit.abbreviatedOid}</a></code>
      </div>
    );
  }
}
