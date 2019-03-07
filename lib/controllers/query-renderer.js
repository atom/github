import React from 'react';
import {QueryRenderer as RelayQueryRenderer} from 'react-relay';
import RelayEnvironment from '../relay-environment-context';

const QueryRenderer = props =>
  <RelayEnvironment.Consumer>{
    environment =>
      <RelayQueryRenderer
        environment={environment}
        {...props}
      />
  }</RelayEnvironment.Consumer>

export default QueryRenderer