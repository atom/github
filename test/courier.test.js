import React from 'react';
import {mount} from 'enzyme';

import Courier from '../lib/courier';

describe('Courier', function() {
  it('accesses requested synchronous properties', function() {
    class Consumer extends React.Component {
      static mailbox = {
        atom: ['tooltips', 'config'],
      }

      render() {
        return (
          <div>
            <p className="tooltips">{this.m.atom.tooltips}</p>
            <p className="config">{this.m.atom.config}</p>
          </div>
        );
      }
    }

    Courier.register(Consumer);

    function registerProviders(courier) {
      courier.provider('atom', c => {
        c.syncProperty('tooltips', model => model.tooltips);
        c.syncProperty('config', model => model.config);
      });
    }

    const atomModel = {
      tooltips: 'tooltips',
      config: 'config',
    };

    const app = (
      <Courier.Provider registerProviders={registerProviders} atom={atomModel}>
        <Consumer />
      </Courier.Provider>
    );
    const wrapper = mount(app);

    assert.strictEqual(wrapper.find('.tooltips').text(), 'tooltips');
    assert.strictEqual(wrapper.find('.config').text(), 'config');
  });

  it('accesses properties available asynchronously', async function() {
    class Consumer extends React.Component {
      static mailbox = {
        repo: ['remotes', 'branches'],
      }

      render() {
        if (this.m.isLoading()) {
          return <div>Loading</div>;
        }

        return (
          <div className="loaded">
            <p className="remotes">{this.m.repo.remotes}</p>
            <p className="branches">{this.m.repo.branches}</p>
          </div>
        );
      }
    }

    Courier.register(Consumer);

    function registerProviders(courier) {
      courier.provider('repo', c => {
        c.asyncProperty('remotes', model => model.getRemotes());
        c.asyncProperty('branches', model => model.getBranches());
      });
    }

    let resolveRemotes = () => {};
    let resolveBranches = () => {};

    const repoModel = {
      getRemotes() {
        return new Promise(resolve => { resolveRemotes = resolve; });
      },

      getBranches() {
        return new Promise(resolve => { resolveBranches = resolve; });
      },
    };

    const app = (
      <Courier.Provider registerProviders={registerProviders} repo={repoModel}>
        <Consumer />
      </Courier.Provider>
    );
    const wrapper = mount(app);

    assert.strictEqual(wrapper.find('div').text(), 'Loading');

    resolveRemotes('remotes');
    assert.strictEqual(wrapper.find('div').text(), 'Loading');

    resolveBranches('branches');

    await assert.async.isTrue(wrapper.update().exists('.loaded'));
    assert.strictEqual(wrapper.find('.remotes').text(), 'remotes');
    assert.strictEqual(wrapper.find('.branches').text(), 'branches');
  });
});
