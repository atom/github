import React from 'react';
import ReactDom from 'react-dom';
import {graphql} from 'react-relay';

import UserMentionTooltipContainer from '../containers/user-mention-tooltip-container';
import QueryRenderer from '../controllers/query-renderer';

export default ({ username }) =>
  <QueryRenderer
    query={graphql`
      query userMentionTooltipItemQuery($username: String!) {
        repositoryOwner(login: $username) {
          ...userMentionTooltipContainer_repositoryOwner
        }
      }
    `}
    variables={{username}}
    render={({error, props, retry}) => {
      console.log('got props:', props)
      if (error) {
        return <div>Could not load information</div>;
      } else if (props) {
        return <UserMentionTooltipContainer {...props} />;
      } else {
        return (
          <div className="github-Loader">
            <span className="github-Spinner" />
          </div>
        );
      }
    }}/>

