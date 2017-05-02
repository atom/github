import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

export default class PrUrlInputBox extends React.Component {
  static propTypes = {
    onSubmit: PropTypes.func.isRequired,
    children: PropTypes.node,
  }

  constructor(props, context) {
    super(props, context);
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

  @autobind
  handleSubmitUrlClick(e) {
    e.preventDefault();
    this.handleSubmitUrl();
  }

  @autobind
  handleSubmitUrl() {
    this.props.onSubmit(this.state.url);
  }

  @autobind
  handleUrlChange(e) {
    this.setState({url: e.target.value});
  }
}
