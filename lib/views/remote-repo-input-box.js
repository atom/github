import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

export default class RemoteRepoInputBox extends React.Component {
  static propTypes = {
    onSubmit: PropTypes.func.isRequired,
    children: PropTypes.node,
  }

  constructor(props, context) {
    super(props, context);
    this.state = {
      repo: '',
    };
  }

  render() {
    return (
      <form className="github-RemoteRepoInputBox-Subview" onSubmit={this.handleSubmitRepo}>
        {this.props.children}
        <input
          type="text"
          className="input-text native-key-bindings"
          placeholder="e.g. https://github.com/owner/repo"
          value={this.state.repo}
          onChange={this.handleRepoChange}
        />
        <div>
          <input
            type="submit"
            value="Submit"
            onClick={this.handleSubmitRepoClick} className="btn btn-primary icon icon-check inline-block-tight"
          />
        </div>
      </form>
    );
  }

  @autobind
  handleSubmitRepoClick(e) {
    e.preventDefault();
    this.handleSubmitRepo();
  }

  @autobind
  handleSubmitRepo() {
    this.props.onSubmit(this.state.url);
  }

  @autobind
  handleRepoChange(e) {
    this.setState({repo: e.target.value});
  }
}
