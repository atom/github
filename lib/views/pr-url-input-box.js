import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

export default class PrUrlInputBox extends React.Component {
  static propTypes = {
    onSubmit: PropTypes.func.isRequired,
    children: PropTypes.func,
  }

  constructor(props, context) {
    super(props, context);
    this.state = {
      url: '',
    };
  }

  render() {
    const ourChildren = (
      [
        <input
          key="pr-url-input-box-1"
          type="text"
          className="input-text native-key-bindings"
          placeholder="e.g. https://github.com/owner/repo/pull/123"
          value={this.state.url}
          onChange={this.handleUrlChange}
        />,
        <div
          key="pr-url-input-box-2">
          <input
            type="submit"
            value="Submit"
            onClick={this.handleSubmitUrlClick} className="btn btn-primary icon icon-check inline-block-tight"
          />
        </div>,
      ]
    );

    return (
      <form className="github-PrUrlInputBox-Subview" onSubmit={this.handleSubmitUrl}>
        {this.props.children ? this.props.children(ourChildren) : ourChildren}
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
