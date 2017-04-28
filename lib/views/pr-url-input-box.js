import React from 'react';
import Relay from 'react-relay';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

export default class PrUrlInputBox extends React.Component {
  static propTypes = {
    onSubmit: PropTypes.func.isRequired,
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
        <p>
          Specify github.com url for PR that is associated with current branch:
        </p>
        <input
          type="text"
          className="input-text native-key-bindings"
          placeholder="Enter your url: https://github.com/owner/repo/pull/688"
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
