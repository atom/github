import React from 'react';
import ReactDom from 'react-dom';
import {autobind} from 'core-decorators';

import Tabs from './tabs';
import WaterfallTab from './timing/waterfall-tab';
import BoxPlotTab from './timing/boxplot-tab';

export default class GitTimingsView extends React.Component {
  static propTypes = {
    container: React.PropTypes.any.isRequired,
  }

  static createPaneItem() {
    let element;
    return {
      serialize() { return {deserializer: 'GitTimingsView'}; },
      getURI() { return 'atom-github://debug/markers'; },
      getTitle() { return 'GitHub Package Timings View'; },
      get element() {
        if (!element) {
          element = document.createElement('div');
          ReactDom.render(<GitTimingsView container={element} />, element);
        }
        return element;
      },
    };
  }

  static deserialize() {
    return this.createPaneItem();
  }

  constructor(props, context) {
    super(props, context);

    this.state = {
      activeTab: 0,
    };
  }

  componentDidMount() {
    this.subscriptions = atom.workspace.onDidDestroyPaneItem(({item}) => {
      if (item.element === this.props.container) {
        // we just got closed
        ReactDom.unmountComponentAtNode(this.props.container);
      }
    });
  }

  render() {
    return (
      <Tabs activeIndex={this.state.activeTab} onChange={this.handleChangeTab} className="timing-tabs">
        <Tabs.Panel title="Waterfall">
          <WaterfallTab />
        </Tabs.Panel>
        <Tabs.Panel title="Box Plot">
          <BoxPlotTab />
        </Tabs.Panel>
      </Tabs>
    );
  }

  componentWillUnmount() {
    this.subscriptions.dispose();
  }

  @autobind
  handleChangeTab(activeTab) {
    this.setState({activeTab});
  }
}

atom.deserializers.add(GitTimingsView);
