import React from 'react';
import Relay from 'react-relay';

/**
 * This is a copy of `RelayRootContainer` from the Relay
 * codebase, but with an optional `environment` prop
 * that can be used instead of the singleton `RelayStore`.
 */
export default function RelayRootContainer({
  Component,
  forceFetch,
  onReadyStateChange,
  renderFailure,
  renderFetched,
  renderLoading,
  route,
  shouldFetch,
  environment,
}) {
  return (
    <Relay.Renderer
      Container={Component}
      forceFetch={forceFetch}
      onReadyStateChange={onReadyStateChange}
      queryConfig={route}
      environment={environment || Relay.Store}
      shouldFetch={shouldFetch}
      render={({done, error, props, retry, stale}) => {
        if (error) {
          if (renderFailure) {
            return renderFailure(error, retry);
          }
        } else if (props) {
          if (renderFetched) {
            return renderFetched(props, {done, stale});
          } else {
            return <Component {...props} />;
          }
        } else {
          if (renderLoading) {
            return renderLoading();
          }
        }
        return undefined;
      }}
    />
  );
}

RelayRootContainer.propTypes = {
  Component: Relay.PropTypes.Container,
  forceFetch: React.PropTypes.bool,
  onReadyStateChange: React.PropTypes.func,
  renderFailure: React.PropTypes.func,
  renderFetched: React.PropTypes.func,
  renderLoading: React.PropTypes.func,
  route: Relay.PropTypes.QueryConfig.isRequired,
  shouldFetch: React.PropTypes.bool,
  environment: React.PropTypes.object,
};
