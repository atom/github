import React from 'react';
import PropTypes from 'prop-types';

export default class Accumulator extends React.Component {
  static propTypes = {
    // Relay props
    relay: PropTypes.shape({
      hasMore: PropTypes.func.isRequired,
      loadMore: PropTypes.func.isRequired,
      isLoading: PropTypes.func.isRequired,
    }).isRequired,
    resultBatch: PropTypes.arrayOf(PropTypes.any).isRequired,

    // Control props
    pageSize: PropTypes.number.isRequired,
    waitTimeMs: PropTypes.number.isRequired,

    // Render prop. Called with (error, full result list) each time more results arrive. Return value is rendered as a
    // child element.
    children: PropTypes.func,

    // Side-effect callback prop. Called with the full accumulated list each time it's updated outside of the render
    // cycle. Use this callback when you need to trigger a side effect from the callback result (like a setState()
    // or forceUpdate() call).
    handleResults: PropTypes.func,
  }

  static defaultProps = {
    children: () => {},
    handleResults: () => {},
  }

  constructor(props) {
    super(props);

    this.nextUpdateID = null;
    this.state = {
      error: null,
      all: this.props.resultBatch,
    };
  }

  componentDidMount() {
    this.props.handleResults(this.state.error, this.state.all);
    this.attemptToLoadMore();
  }

  render() {
    return this.props.children(this.state.error, this.state.all);
  }

  attemptToLoadMore = () => {
    this.nextUpdateID = null;

    if (!this.props.relay.hasMore()) {
      return;
    }

    if (this.props.relay.isLoading()) {
      return;
    }

    this.props.relay.loadMore(this.props.pageSize, this.accumulate);
  }

  accumulate = error => {
    if (error) {
      this.setState({error}, () => {
        this.props.handleResults(error, this.state.all);
      });
    } else {
      const nextBatch = this.props.resultBatch;
      this.setState(prevState => {
        return {all: [...prevState.all, ...nextBatch]};
      }, () => {
        this.props.handleResults(this.state.error, this.state.all);

        /* istanbul ignore if */
        if (this.props.waitTimeMs > 0 && this.nextUpdateID === null) {
          this.nextUpdateID = setTimeout(this.attemptToLoadMore, this.props.waitTimeMs);
        } else {
          this.attemptToLoadMore();
        }
      });
    }
  }
}
