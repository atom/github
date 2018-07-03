import React from 'react';
import {mount} from 'enzyme';

import GithubDotcomMarkdown from '../../lib/views/github-dotcom-markdown';

describe('GithubDotcomMarkdown', function() {
  function buildApp(overloadProps = {}) {
    return (
      <GithubDotcomMarkdown
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
    const handleClickEvent = sinon.stub();

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
      handleClickEvent,
    }));

    const issueishLink = wrapper.getDOMNode().querySelector('a.issue-link');
    issueishLink.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }));

    assert.strictEqual(handleClickEvent.callCount, 1);

    const nonIssueishLink = wrapper.getDOMNode().querySelector('a.other');
    nonIssueishLink.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    }));

    assert.strictEqual(handleClickEvent.callCount, 1);

    // Force a componentDidUpdate to exercise tooltip handler re-registration
    wrapper.setProps({});

    // Unmount to unsubscribe
    wrapper.unmount();
  });

  it('registers command handlers', function() {
    const openIssueishLinkInNewTab = sinon.stub();
    const openLinkInBrowser = sinon.stub();
    const switchToIssueish = sinon.stub();

    const wrapper = mount(buildApp({
      html: `
        <p>
          <a data-url="https://github.com/aaa/bbb/issue/123" href="https://github.com/aaa/bbb/issue/123">#123</a>
        </p>
      `,
      openIssueishLinkInNewTab,
      openLinkInBrowser,
      switchToIssueish,
    }));

    const link = wrapper.getDOMNode().querySelector('a');
    const href = 'https://github.com/aaa/bbb/issue/123';

    atom.commands.dispatch(link, 'github:open-link-in-new-tab');
    assert.isTrue(openIssueishLinkInNewTab.calledWith(href));

    atom.commands.dispatch(link, 'github:open-link-in-this-tab');
    assert.isTrue(switchToIssueish.calledWith('aaa', 'bbb', 123));

    atom.commands.dispatch(link, 'github:open-link-in-browser');
    assert.isTrue(openLinkInBrowser.calledWith(href));
  });
});
