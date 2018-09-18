import React from 'react';
import {mount} from 'enzyme';
import {shell} from 'electron';

import {BareGithubDotcomMarkdown} from '../../lib/views/github-dotcom-markdown';
import {handleClickEvent, openIssueishLinkInNewTab, openLinkInBrowser} from '../../lib/views/issueish-link';
import RelayNetworkLayerManager from '../../lib/relay-network-layer-manager';
import * as reporterProxy from '../../lib/reporter-proxy';

describe('GithubDotcomMarkdown', function() {
  let relayEnvironment;

  beforeEach(function() {
    relayEnvironment = RelayNetworkLayerManager.getEnvironmentForHost('https://api.somehost.com', '1234');
  });

  function buildApp(overloadProps = {}) {
    return (
      <BareGithubDotcomMarkdown
        relayEnvironment={relayEnvironment}
        html={'<p>content</p>'}
        switchToIssueish={() => {}}
        handleClickEvent={() => {}}
        openIssueishLinkInNewTab={() => {}}
        openLinkInBrowser={() => {}}
        {...overloadProps}
      />
    );
  }

  it('embeds pre-rendered markdown into a div', function() {
    const wrapper = mount(buildApp({
      html: '<pre class="yes">something</pre>',
    }));

    assert.include(wrapper.find('.github-DotComMarkdownHtml').html(), '<pre class="yes">something</pre>');
  });

  it('intercepts click events on issueish links', function() {
    const handleClickEventStub = sinon.stub();

    const wrapper = mount(buildApp({
      html: `
        <p>
          This text has
          <a
            class="issue-link"
            data-url="https://github.com/aaa/bbb/issue/123"
            href="https://github.com/aaa/bbb/issue/123">
            an issueish link
          </a>
          and
          <a class="other" href="https://example.com">
            a non-issuish link
          </a>
          and
          <a class="user-mention" href="https://example.com">
            a user mention
          </a>
          in it
        </p>
      `,
      handleClickEvent: handleClickEventStub,
    }));

    const issueishLink = wrapper.getDOMNode().querySelector('a.issue-link');
    issueishLink.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }));

    assert.strictEqual(handleClickEventStub.callCount, 1);

    const nonIssueishLink = wrapper.getDOMNode().querySelector('a.other');
    nonIssueishLink.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }));

    assert.strictEqual(handleClickEventStub.callCount, 1);

    // Force a componentDidUpdate to exercise tooltip handler re-registration
    wrapper.setProps({});

    // Unmount to unsubscribe
    wrapper.unmount();
  });

  it('registers command handlers', function() {
    const openIssueishLinkInNewTabStub = sinon.stub();
    const openLinkInBrowserStub = sinon.stub();
    const switchToIssueishStub = sinon.stub();

    const wrapper = mount(buildApp({
      html: `
        <p>
          <a data-url="https://github.com/aaa/bbb/issue/123" href="https://github.com/aaa/bbb/issue/123">#123</a>
        </p>
      `,
      openIssueishLinkInNewTab: openIssueishLinkInNewTabStub,
      openLinkInBrowser: openLinkInBrowserStub,
      switchToIssueish: switchToIssueishStub,
    }));

    const link = wrapper.getDOMNode().querySelector('a');
    const href = 'https://github.com/aaa/bbb/issue/123';

    atom.commands.dispatch(link, 'github:open-link-in-new-tab');
    assert.isTrue(openIssueishLinkInNewTabStub.calledWith(href));

    atom.commands.dispatch(link, 'github:open-link-in-this-tab');
    assert.isTrue(switchToIssueishStub.calledWith('aaa', 'bbb', 123));

    atom.commands.dispatch(link, 'github:open-link-in-browser');
    assert.isTrue(openLinkInBrowserStub.calledWith(href));
  });

  describe('opening issueish links', function() {
    let wrapper;

    beforeEach(function() {
      wrapper = mount(buildApp({
        html: `
          <p>
            <a
              class="issue-link"
              data-url="https://github.com/aaa/bbb/issues/123"
              href="https://github.com/aaa/bbb/issues/123">
              an issueish link
            </a>
          </p>
        `,
        handleClickEvent,
        openIssueishLinkInNewTab,
        openLinkInBrowser,
      }));
    });

    it('opens item in pane and activates accordingly', async function() {
      sinon.stub(atom.workspace, 'open').returns(Promise.resolve());
      const issueishLink = wrapper.getDOMNode().querySelector('a.issue-link');

      // regular click opens item and activates it
      issueishLink.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }));

      await assert.async.isTrue(atom.workspace.open.called);
      assert.deepEqual(atom.workspace.open.lastCall.args[1], {activateItem: true});

      // holding down meta key simply opens item
      issueishLink.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        metaKey: true,
      }));

      await assert.async.isTrue(atom.workspace.open.calledTwice);
      assert.deepEqual(atom.workspace.open.lastCall.args[1], {activateItem: false});
    });

    it('records event for opening issueish in pane item', async function() {
      sinon.stub(atom.workspace, 'open').returns(Promise.resolve());
      sinon.stub(reporterProxy, 'addEvent');
      const issueishLink = wrapper.getDOMNode().querySelector('a.issue-link');
      issueishLink.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }));

      await assert.async.isTrue(reporterProxy.addEvent.calledWith('open-issueish-in-pane', {package: 'github', from: 'issueish-link', target: 'new-tab'}));
    });

    it('does not record event if opening issueish in pane item fails', function() {
      sinon.stub(atom.workspace, 'open').returns(Promise.reject());
      sinon.stub(reporterProxy, 'addEvent');

      // calling `handleClick` directly rather than dispatching event so that we can catch the error thrown and prevent errors in the console
      assert.isRejected(
        wrapper.instance().handleClick({
          bubbles: true,
          cancelable: true,
          target: {
            dataset: {
              url: 'https://github.com/aaa/bbb/issues/123',
            },
          },
          preventDefault: () => {},
          stopPropagation: () => {},
        }),
      );

      assert.isTrue(atom.workspace.open.called);
      assert.isFalse(reporterProxy.addEvent.called);
    });

    it('opens item in browser if shift key is pressed', function() {
      sinon.stub(shell, 'openExternal').callsArg(2);

      const issueishLink = wrapper.getDOMNode().querySelector('a.issue-link');

      issueishLink.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      }));

      assert.isTrue(shell.openExternal.called);
    });

    it('records event for opening issueish in browser', async function() {
      sinon.stub(shell, 'openExternal').callsArg(2);
      sinon.stub(reporterProxy, 'addEvent');

      const issueishLink = wrapper.getDOMNode().querySelector('a.issue-link');

      issueishLink.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      }));

      await assert.async.isTrue(reporterProxy.addEvent.calledWith('open-issueish-in-browser', {package: 'github', from: 'issueish-link'}));
    });

    it('does not record event if opening issueish in browser fails', function() {
      sinon.stub(shell, 'openExternal').callsArgWith(2, new Error('oh noes'));
      sinon.stub(reporterProxy, 'addEvent');

      // calling `handleClick` directly rather than dispatching event so that we can catch the error thrown and prevent errors in the console
      assert.isRejected(
        wrapper.instance().handleClick({
          bubbles: true,
          cancelable: true,
          shiftKey: true,
          target: {
            dataset: {
              url: 'https://github.com/aaa/bbb/issues/123',
            },
          },
        }),
      );

      assert.isTrue(shell.openExternal.called);
      assert.isFalse(reporterProxy.addEvent.called);
    });
  });
});
