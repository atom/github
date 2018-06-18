import React from 'react';
import PropTypes from 'prop-types';

import {autobind} from '../helpers';

export default class ErrorView extends React.Component {
  static propTypes = {
    title: PropTypes.string,
    descriptions: PropTypes.arrayOf(PropTypes.string),
    preformatted: PropTypes.bool,

    retry: PropTypes.func,
    logout: PropTypes.func,
  }

  static defaultProps = {
    title: 'Error',
    descriptions: ['An unknown error occurred'],
    preformatted: false,
  }

  constructor(props) {
    super(props);

    autobind(this, 'renderDescription');
  }

  render() {
    return (
      <div className="github-Message">
        <div className="github-Message-wrapper">
          <h1 className="github-Message-title">{this.props.title}</h1>
          {this.props.descriptions.map(this.renderDescription)}
          <div className="github-Message-action">
            {this.props.retry && (
              <button className="github-Message-button btn btn-primary" onClick={this.props.retry}>Try Again</button>
            )}
            <button className="github-Message-button btn" onClick={this.props.logout}>Logout</button>
          </div>
        </div>
      </div>
    );
  }

  renderDescription(description, key) {
    if (this.props.preformatted) {
      return (
        <pre key={key} className="github-Message-description">
          {description}
        </pre>
      );
    } else {
      return (
        <p key={key} className="github-Message-description">
          {description}
        </p>
      );
    }
  }
}
