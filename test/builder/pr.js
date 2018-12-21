class CommentBuilder {
  constructor() {
    this._id = 0;
    this._path = 'first.txt';
    this._position = 0;
    this._authorLogin = 'someone';
    this._authorAvatarUrl = 'https://avatars3.githubusercontent.com/u/17565?s=32&v=4';
    this._url = 'https://github.com/atom/github/pull/1829/files#r242224689';
    this._createdAt = 0;
    this._body = 'Lorem ipsum dolor sit amet, te urbanitas appellantur est.';
  }

  id(i) {
    this._id = i;
    return this;
  }

  path(p) {
    this._path = p;
    return this;
  }

  position(pos) {
    this._position = pos;
    return this;
  }

  authorLogin(login) {
    this._authorLogin = login;
    return this;
  }

  authorAvatarUrl(url) {
    this._authorAvatarUrl = url;
    return this;
  }

  url(u) {
    this._url = u;
    return this;
  }

  createdAt(ts) {
    this._createdAt = ts;
    return this;
  }

  body(text) {
    this._body = text;
    return this;
  }

  build() {
    return {
      id: this._id,
      author: {
        login: this._authorLogin,
        avatarUrl: this._authorAvatarUrl,
      },
      body: this._body,
      path: this._path,
      position: this._position,
      createdAt: this._createdAt,
      url: this._url,
    };
  }
}

class ReviewBuilder {
  constructor() {
    this.nextCommentID = 0;
    this._id = 0;
    this._comments = [];
  }

  id(i) {
    this._id = i;
    return this;
  }

  addComment(block = () => {}) {
    const builder = new CommentBuilder();
    builder.id(this.nextCommentID);
    this.nextCommentID++;

    block(builder);
    this._comments.push(builder.build());

    return this;
  }

  build() {
    return {
      id: this._id,
      comments: {nodes: this._comments},
    };
  }
}

class PullRequestBuilder {
  constructor() {
    this.nextCommentID = 0;
    this.nextReviewID = 0;
    this._reviews = [];
  }

  addReview(block = () => {}) {
    const builder = new ReviewBuilder();
    builder.id(this.nextReviewID);
    this.nextReviewID++;

    block(builder);
    this._reviews.push(builder.build());
    return this;
  }

  build() {
    return {
      reviews: {nodes: this._reviews},
    };
  }
}

export function reviewBuilder() {
  return new ReviewBuilder();
}

export function pullRequestBuilder() {
  return new PullRequestBuilder();
}
