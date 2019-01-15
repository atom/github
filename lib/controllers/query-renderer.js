import React from 'react';
import {QueryRenderer} from 'react-relay';
import RelayEnvironment from '../relay-environment-context';

export default props => {
  return (
    <RelayEnvironment.Consumer>{
      environment => {
        console.log('acquired environment:', environment);
        return (
          <QueryRenderer
            environment={environment}
            {...props}
          />
        );
      }
    }</RelayEnvironment.Consumer>
  );
};
