import React from 'react';
import PropTypes from 'prop-types';
import {Disposable} from 'event-kit';

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

    // Render prop. Called with (error, full result list, loading) each time more results arrive. Return value is
    // rendered as a child element.
    children: PropTypes.func,

    // Side-effect callback prop. Called with (error, full result list, loading) each time it's updated outside of the
    // render cycle. Use this callback when you need to trigger a side effect from the callback result (like a
    // setState() or forceUpdate() call).
    handleResults: PropTypes.func,

    // Called right after refetch happens
    onDidRefetch: PropTypes.func.isRequired,
  }

  static defaultProps = {
    children: () => null,
    handleResults: () => {},
  }

  constructor(props) {
    super(props);

    this.sub = new Disposable();
    this.nextUpdateID = null;
    this.state = {error: null};
  }

  componentWillUnmount() {
    this.sub.dispose();
  }

  componentDidMount() {
    this.attemptToLoadMore();
  }

  render() {
    return this.props.children(this.state.error, this.props.resultBatch, this.props.relay.hasMore());
  }

  attemptToLoadMore = () => {
    this.nextUpdateID = null;

    /* istanbul ignore if */
    if (!this.props.relay.hasMore() || this.props.relay.isLoading()) {
      return;
    }

    this.props.relay.loadMore(this.props.pageSize, this.accumulate);
  }

  accumulate = error => {
    if (error) {
      this.setState({error});
    } else {
      /* istanbul ignore next */
      if (this.props.waitTimeMs > 0 && this.nextUpdateID === null) {
        this.nextUpdateID = setTimeout(this.attemptToLoadMore, this.props.waitTimeMs);
      } else {
        this.attemptToLoadMore();
      }
    }
  }
}
