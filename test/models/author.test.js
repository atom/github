import Author, {NO_REPLY_GITHUB_EMAIL} from '../../lib/models/author';

describe('Author', function() {
  it('recognizes the no-reply GitHub email address', function() {
    const a0 = new Author('foo@bar.com', 'Eh');
    assert.isFalse(a0.isNoReply());

    const a1 = new Author(NO_REPLY_GITHUB_EMAIL, 'Whatever');
    assert.isTrue(a1.isNoReply());
  });

  it('distinguishes authors with a GitHub handle', function() {
    const a0 = new Author('foo@bar.com', 'Eh', 'handle');
    assert.isTrue(a0.hasLogin());

    const a1 = new Author('other@bar.com', 'Nah');
    assert.isFalse(a1.hasLogin());
  });
});
