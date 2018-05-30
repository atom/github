import Author, {nullAuthor, NO_REPLY_GITHUB_EMAIL} from '../../lib/models/author';

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

  it('implements matching by email address', function() {
    const a0 = new Author('same@same.com', 'Zero');
    const a1 = new Author('same@same.com', 'One');
    const a2 = new Author('same@same.com', 'Two', 'two');
    const a3 = new Author('different@same.com', 'Three');

    assert.isTrue(a0.matches(a1));
    assert.isTrue(a0.matches(a2));
    assert.isFalse(a0.matches(a3));
    assert.isFalse(a0.matches(nullAuthor));
  });
});
