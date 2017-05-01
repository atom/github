import React from 'react';
import ReactDom from 'react-dom';

import IssueishTooltipRoute from '../routes/issueish-tooltip-route';
import IssueishContainer from '../containers/issueish-tooltip-container';
import RelayRootContainer from '../containers/relay-root-container';

export default class IssueishTooltipItem {
  constructor(issueishUrl, relayEnvironment) {
    this.issueishUrl = issueishUrl;
    this.relayEnvironment = relayEnvironment;
  }

  getElement() {
    return this.element;
  }

  get element() {
    if (!this._element) {
      const route = new IssueishTooltipRoute({issueishUrl: this.issueishUrl});
      this._element = document.createElement('div');
      const rootContainer = (
        <RelayRootContainer
          Component={IssueishContainer}
          route={route}
          environment={this.relayEnvironment}
          renderLoading={() => {
            // TODO: adjust min width/height
            return (
              <div className="github-Loader">
                <span className="github-Spinner" />
              </div>
            );
          }}
          renderFailure={() => <div>Could not load information</div>}
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
