import React from 'react';
import PropTypes from 'prop-types';

import {autobind} from '../helpers';

export default class GithubLoginView extends React.Component {
  static propTypes = {
    children: PropTypes.node,
    onLogin: PropTypes.func,
  }

  static defaultProps = {
    children: <p>Log in to GitHub to access PR information and more!</p>,
    onLogin: token => {},
  }

  constructor(props, context) {
    super(props, context);
    autobind(
      this,
      'handleLoginClick', 'handleCancelTokenClick', 'handleSubmitTokenClick', 'handleSubmitToken', 'handleTokenChange',
    );
    this.state = {
      loggingIn: false,
      token: '',
    };
  }

  render() {
    let subview;
    if (this.state.loggingIn) {
      subview = this.renderTokenInput();
    } else {
      subview = this.renderLogin();
    }

    return (
      <div className="github-GithubLoginView">
        {subview}
      </div>
    );
  }

  renderLogin() {
    return (
      <div className="github-GithubLoginView-Subview">
        {this.props.children}
        <button onClick={this.handleLoginClick} className="btn btn-primary btn-lg icon icon-octoface">
          Login
        </button>
      </div>
    );
  }

  renderTokenInput() {
    return (
      <form className="github-GithubLoginView-Subview" onSubmit={this.handleSubmitToken}>
        <p>
          Step 1: Visit <a href="https://github.atom.io/login">github.atom.io/login</a> to generate
          an authentication token.
        </p>
        <p>
          Step 2: Enter the token below:
        </p>
        <input
          type="text"
          className="input-text native-key-bindings"
          placeholder="Enter your token..."
          value={this.state.token}
          onChange={this.handleTokenChange}
        />
        <div>
          <button type="button" onClick={this.handleCancelTokenClick} className="btn icon inline-block-tight">
            Cancel
          </button>
          <input
            type="submit"
            value="Login"
            onClick={this.handleSubmitTokenClick} className="btn btn-primary icon icon-check inline-block-tight"
          />
        </div>
      </form>
    );
  }

  handleLoginClick() {
    this.setState({loggingIn: true});
  }

  handleCancelTokenClick(e) {
    e.preventDefault();
    this.setState({loggingIn: false});
  }

  handleSubmitTokenClick(e) {
    e.preventDefault();
    this.handleSubmitToken();
  }

  handleSubmitToken() {
    this.props.onLogin(this.state.token);
  }

  handleTokenChange(e) {
    this.setState({token: e.target.value});
  }
}
