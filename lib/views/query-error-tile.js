import React from 'react';
import PropTypes from 'prop-types';

import Octicon from '../atom/octicon';

export default class QueryErrorTile extends React.Component {
  static propTypes = {
    error: PropTypes.shape({
      response: PropTypes.shape({
        status: PropTypes.number.isRequired,
      }),
      responseText: PropTypes.string,
      errors: PropTypes.arrayOf(PropTypes.shape({
        message: PropTypes.string.isRequired,
      })),
    }).isRequired,
  }

  render() {
    return (
      <div className="github-QueryErrorTile">
        <Octicon icon="alert" />
        {this.renderMessages()}
      </div>
    );
  }

  renderMessages() {
    if (this.props.error.errors) {
      return this.props.error.errors.map((error, index) => {
        return (
          <p key={index} className="github-QueryErrorTile-message">
            {error.message}
          </p>
        );
      });
    }

    if (this.props.error.response) {
      return (
        <p key={0} className="github-QueryErrorTile-message">
          {this.props.error.responseText}
        </p>
      );
    }

    return <p key={0} className="github-QueryErrorTile-message">{this.props.error.toString()}</p>;
  }
}
