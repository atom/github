import React from 'react';
import PropTypes from 'prop-types';
import cx from 'classnames';

export default class ErrorBoundary extends React.Component {
  static propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
  }

  static defaultProps = {
    className: '',
  }

  state = {
    error: null,
    info: null,
  }

  componentDidCatch(error, info) {
    this.setState({error, info});
  }

  render() {
    if (this.state.error) {
      return this.renderError();
    } else {
      return this.props.children;
    }
  }

  renderError() {
    const {children, className, ...others} = this.props; // eslint-disable-line no-unused-vars
    const {error, info} = this.state;

    return (
      <div className={cx('github-ErrorBoundary', className)} {...others}>
        <h1>{error.name}</h1>
        <pre>{error.message}</pre>
        <pre>{error.stack}</pre>
        <hr />
        <pre>The error was thrown{info.componentStack}</pre>
      </div>
    );
  }
}
