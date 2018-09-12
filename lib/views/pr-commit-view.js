import React from 'react';
import PropTypes from 'prop-types';

export default class PrCommitView extends React.Component {
  render() {
    return (
      <div className="github-PrCommitView-container">
      <p>{this.props.commit.message}</p>
      <a href={this.props.commit.url}>{this.props.commit.abbreviatedOid}</a>
      </div>
    );
  }
}
