import React from 'react';
import {graphql} from 'react-relay';

import IssueishTooltipContainer from '../containers/issueish-tooltip-container';
import QueryRenderer from '../controllers/query-renderer';

export default ({ issueishUrl }) =>
  <QueryRenderer
    query={graphql`
      query issueishTooltipItemQuery($issueishUrl: URI!) {
        resource(url: $issueishUrl) {
          ...issueishTooltipContainer_resource
        }
      }
    `}
    variables={{issueishUrl}}
    render={({error, props, retry}) => {
      if (error) {
        return <div>Could not load information</div>;
      } else if (props) {
        return <IssueishTooltipContainer {...props} />;
      } else {
        return (
          <div className="github-Loader">
            <span className="github-Spinner" />
          </div>
        );
      }
    }}
  />
