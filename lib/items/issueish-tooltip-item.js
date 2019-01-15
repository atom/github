import React from 'react';
import ReactDom from 'react-dom';
import {graphql} from 'react-relay';

import IssueishTooltipContainer from '../containers/issueish-tooltip-container';
import QueryRenderer from '../controllers/query-renderer';

export default class IssueishTooltipItem {
  constructor(issueishUrl) {
    this.issueishUrl = issueishUrl;
  }

  getElement() {
    return this.element;
  }

  get element() {
    if (!this._element) {
      this._element = document.createElement('div');
      const rootContainer = (
        <QueryRenderer
          query={graphql`
            query issueishTooltipItemQuery($issueishUrl: URI!) {
              resource(url: $issueishUrl) {
                ...issueishTooltipContainer_resource
              }
            }
          `}
          variables={{
            issueishUrl: this.issueishUrl,
          }}
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
      );
      this._component = ReactDom.render(rootContainer, this._element);
    }

    return this._element;
  }

  destroy() {
    if (this._element) {
      ReactDom.unmountComponentAtNode(this._element);
      delete this._element;
    }
  }
}
