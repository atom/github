import React from 'react';
import ReactDom from 'react-dom';

import UserMentionTooltipRoute from '../routes/user-mention-tooltip-route';
import UserMentionTooltipContainer from '../containers/user-mention-tooltip-container';
import RelayRootContainer from '../containers/relay-root-container';

export default class UserMentionTooltipItem {
  constructor(username, relayEnvironment) {
    this.username = username.substr(1);
    this.relayEnvironment = relayEnvironment;
  }

  getElement() {
    return this.element;
  }

  get element() {
    if (!this._element) {
      const route = new UserMentionTooltipRoute({username: this.username});
      this._element = document.createElement('div');
      const rootContainer = (
        <RelayRootContainer
          Component={UserMentionTooltipContainer}
          route={route}
          environment={this.relayEnvironment}
          renderLoading={() => {
            return (
              <span
                className="loading loading-spinner-large inline-block"
                style={{minWidth: 250, minHeight: 90}}
              />
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
