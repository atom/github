import React from 'react';
import PropTypes from 'prop-types';
import {autobind} from 'core-decorators';

export default class RemoteCreateForm extends React.Component {
  static propTypes = {
    onSubmit: PropTypes.func.isRequired,
    children: PropTypes.node,
  }

  constructor(props, context) {
    super(props, context);
    this.state = {
      repo: '',
      description: '',
      isPrivate: false,
    };
  }

  render() {
    return (
      <form className="github-RemoteCreateForm-Subview" onSubmit={this.handleSubmitUrl}>
        {this.props.children}
        <input
          type="text"
          className="input-text native-key-bindings"
          placeholder="e.g. owner/repo"
          value={this.state.url}
          onChange={this.handleUrlChange}
        />
        <input
          type="text"
          className="input-text native-key-bindings"
          placeholder="Description"
          value={this.state.url}
          onChange={this.handleUrlChange}
        />
        <label className="input-label">
          <input
            type="checkbox"
            className="input-checkbox"
            onClick={this.handleIsPrivateBoxClick}
            checked={this.state.isPrivate}
          /> Private
        </label>
        <div>
          <input
            type="submit"
            value="Submit"
            onClick={this.handleSubmitFormClick} className="btn btn-primary icon icon-check inline-block-tight"
          />
        </div>
      </form>
    );
  }

  @autobind
  handleSubmitFormClick(e) {
    e.preventDefault();
    this.handleSubmitForm();
  }

  @autobind
  handleSubmitForm() {
    this.props.onSubmit(this.state.repo, this.state.description, this.state.private);
  }

  @autobind
  handleRepoChange(e) {
    this.setState({repo: e.target.value});
  }

  @autobind
  handleDescriptionChange(e) {
    this.setState({url: e.target.value});
  }

  @autobind
  handleIsPrivateBoxClick(e) {
    this.setState({isPrivate: e.target.value});
  }
}
