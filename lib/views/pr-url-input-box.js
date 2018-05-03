import React from 'react';
import PropTypes from 'prop-types';

import {autobind} from '../helpers';

export default class PrUrlInputBox extends React.Component {
  static propTypes = {
    onSubmit: PropTypes.func.isRequired,
    children: PropTypes.node,
  }

  constructor(props, context) {
    super(props, context);
    autobind(this, 'handleSubmitUrlClick', 'handleSubmitUrl', 'handleUrlChange');
    this.state = {
      url: '',
    };
  }

  render() {
    return (
      <form className="github-PrUrlInputBox-Subview" onSubmit={this.handleSubmitUrl}>
        {this.props.children}
        <input
          type="text"
          className="input-text native-key-bindings"
          placeholder="e.g. https://github.com/owner/repo/pull/123"
          value={this.state.url}
          onChange={this.handleUrlChange}
        />
        <div>
          <input
            type="submit"
            value="Submit"
            onClick={this.handleSubmitUrlClick} className="btn btn-primary icon icon-check inline-block-tight"
          />
        </div>
      </form>
    );
  }

  handleSubmitUrlClick(e) {
    e.preventDefault();
    this.handleSubmitUrl();
  }

  handleSubmitUrl() {
    this.props.onSubmit(this.state.url);
  }

  handleUrlChange(e) {
    this.setState({url: e.target.value});
  }
}
