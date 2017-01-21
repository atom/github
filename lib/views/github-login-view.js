import React from 'react';
import {autobind} from 'core-decorators';

export default class GithubLoginView extends React.Component {
  constructor(props, context) {
    super(props, context);
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
        <p>
          Log in to GitHub to access PR information and more!
        </p>
        <button onClick={this.handleLoginClick} className="btn btn-primary btn-lg icon icon-octoface">
          Login
        </button>
      </div>
    );
  }

  renderTokenInput() {
    return (
      <div className="github-GithubLoginView-Subview">
        <p>
          Enter your token from <a href="https://github.atom.io/login">github.atom.io/login</a> below:
        </p>
        <input
          type="text"
          className="input-text native-key-bindings"
          placeholder="Enter your token..."
          value={this.state.token}
          onChange={this.handleTokenChange}
        />
        <div>
          <button onClick={this.handleCancelTokenClick} className="btn icon inline-block-tight">
            Cancel
          </button>
          <button onClick={this.handleSubmitTokenClick} className="btn btn-primary icon icon-check inline-block-tight">
            Login
          </button>
        </div>
      </div>
    );
  }

  @autobind
  handleLoginClick() {
    this.setState({loggingIn: true});
  }

  @autobind
  handleCancelTokenClick() {
    this.setState({loggingIn: false});
  }

  @autobind
  handleSubmitTokenClick() {
    // TODO
    this.setState({loggingIn: false});
  }

  @autobind
  handleTokenChange(e) {
    this.setState({token: e.target.value});
  }
}
