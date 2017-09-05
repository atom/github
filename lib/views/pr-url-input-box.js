import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

export default class PrUrlInputBox extends React.Component {
  static propTypes = {
    onSubmit: PropTypes.func.isRequired,
    refresh: PropTypes.func,
  }

  constructor(props, context) {
    super(props, context);
    this.state = {
      url: '',
    };
  }

  render() {
    return (
      <form onSubmit={this.handleSubmitUrl} className="github-PrUrlInputBox-Subview">
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
          {this.props.refresh &&
            <input
              type="button"
              value="Search Again"
              onClick={this.props.refresh}
              className="btn inline-block-tight"
            />
          }
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
