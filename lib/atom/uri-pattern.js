import url from 'url';

export default class URIPattern {
  constructor(string) {
    this.original = string;

    const parsed = url.parse(dashEscape(string), true);
    this.parts = {
      protocol: asPart(parsed.protocol, '', ':'),
      auth: splitAuth(parsed.auth, asPart),
      hostname: asPart(parsed.hostname),
      port: asPart(parsed.port),
      pathname: (parsed.pathname || '').split('/').slice(1).map(asPart),
      query: Object.keys(parsed.query).reduce(
        (acc, current) => {
          acc[current] = asPart(parsed.query[current]);
          return acc;
        },
        {},
      ),
      hash: asPart(parsed.hash, '#', ''),
    };
  }

  matches(string) {
    const other = url.parse(string, true);
    const params = {};

    // direct matches
    for (const attr of ['protocol', 'hostname', 'port', 'hash']) {
      if (!this.parts[attr].matchesIn(params, other[attr])) {
        return nonURIMatch;
      }
    }

    // auth
    const auth = splitAuth(other.auth);
    if (!this.parts.auth.username.matchesIn(params, auth.username)) {
      return nonURIMatch;
    }
    if (!this.parts.auth.password.matchesIn(params, auth.password)) {
      return nonURIMatch;
    }

    // pathname
    const pathParts = (other.pathname || '').split('/').slice(1);
    let i = 0;
    while (i < pathParts.length) {
      if (!this.parts.pathname[i] || !this.parts.pathname[i].matchesIn(params, pathParts[i])) {
        return nonURIMatch;
      }
      i++;
    }
    if (i !== this.parts.pathname.length) {
      return nonURIMatch;
    }

    // query string
    const remaining = new Set(Object.keys(other.query));
    for (const k in this.parts.query) {
      const mine = this.parts.query[k];
      const yours = other.query[k];
      remaining.delete(k);

      if (!mine.matchesIn(params, yours)) {
        return nonURIMatch;
      }
    }

    if (remaining.size > 0) {
      return nonURIMatch;
    }

    return new URIMatch(params);
  }

  // Access the original string used to create this pattern.
  getOriginal() {
    return this.original;
  }

  toString() {
    return `<URIPattern ${this.original}>`;
  }
}

export const nullURIPattern = {
  matches() {
    return null;
  },

  getOriginal() {
    return '';
  },

  toString() {
    return '<nullURIPattern>';
  },
};

class ExactPart {
  constructor(string) {
    this.string = string;
  }

  matchesIn(params, other) {
    return other === this.string;
  }
}

class CapturePart {
  constructor(name, prefix, suffix) {
    this.name = name;
    this.prefix = prefix;
    this.suffix = suffix;
  }

  matchesIn(params, other) {
    if (this.prefix.length > 0 && other.startsWith(this.prefix)) {
      other = other.slice(this.prefix.length);
    }
    if (this.suffix.length > 0 && other.endsWith(this.suffix)) {
      other = other.slice(-this.suffix.length);
    }
    if (other.length === 0) {
      return false;
    }

    params[this.name] = other;
    return true;
  }
}

function dashEscape(raw) {
  return raw.replace(/[{}-]/g, ch => {
    if (ch === '{') {
      return '-a';
    } else if (ch === '}') {
      return '-z';
    } else {
      return '--';
    }
  });
}

function dashUnescape(escaped) {
  return escaped.replace('--', '-');
}

function asPart(patternSegment, prefix = '', suffix = '') {
  if (patternSegment === null) {
    return new ExactPart(null);
  }

  let subPattern = patternSegment;
  if (subPattern.startsWith(prefix)) {
    subPattern = subPattern.slice(prefix.length);
  }
  if (subPattern.endsWith(suffix)) {
    subPattern = subPattern.slice(-suffix.length);
  }

  if (subPattern.startsWith('-a') && subPattern.endsWith('-z')) {
    return new CapturePart(dashUnescape(subPattern.slice(2, -2)), prefix, suffix);
  } else {
    return new ExactPart(dashUnescape(patternSegment));
  }
}

function splitAuth(auth, fn = x => x) {
  if (auth === null) {
    return {username: fn(null), password: fn(null)};
  }

  const ind = auth.indexOf(':');
  return ind !== -1
    ? {username: fn(auth.slice(0, ind)), password: fn(auth.slice(ind + 1))}
    : {username: fn(auth), password: fn(null)};
}

class URIMatch {
  constructor(params = {}) {
    this.params = params;
  }

  ok() {
    return true;
  }

  getParams() {
    return this.params;
  }
}

const nonURIMatch = {
  ok() {
    return false;
  },

  getParams() {
    return {};
  },
};
