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
      pathname: (parsed.pathname || '').split('/').slice(1).map(segment => asPart(segment)),
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
    let mineInd = 0;
    let yoursInd = 0;
    while (mineInd < this.parts.pathname.length && yoursInd < pathParts.length) {
      const mine = this.parts.pathname[mineInd];
      const yours = pathParts[yoursInd];

      if (mine.isSplat()) {
        if (mine.matchesIn(params, yours)) {
          yoursInd++;
        } else {
          mineInd++;
          yoursInd++;
        }
      } else {
        if (!mine.matchesIn(params, yours)) {
          return nonURIMatch;
        }
        mineInd++;
        yoursInd++;
      }
    }

    while (mineInd < this.parts.pathname.length) {
      const part = this.parts.pathname[mineInd];
      if (!part.matchesEmptyIn(params)) {
        return nonURIMatch;
      }
      mineInd++;
    }

    if (yoursInd !== pathParts.length) {
      return nonURIMatch;
    }

    // query string
    const remaining = new Set(Object.keys(this.parts.query));
    for (const k in other.query) {
      const yours = other.query[k];
      remaining.delete(k);

      const mine = this.parts.query[k];
      if (mine === undefined) {
        return nonURIMatch;
      }

      const allYours = yours instanceof Array ? yours : [yours];

      for (const each of allYours) {
        if (!mine.matchesIn(params, each)) {
          return nonURIMatch;
        }
      }
    }

    for (const k of remaining) {
      const part = this.parts.query[k];
      if (!part.matchesEmptyIn(params)) {
        return nonURIMatch;
      }
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

  isSplat() {
    return false;
  }
}

class CapturePart {
  constructor(name, splat, prefix, suffix) {
    this.name = name;
    this.splat = splat;
    this.prefix = prefix;
    this.suffix = suffix;
  }

  matchesIn(params, other) {
    if (this.prefix.length > 0 && other.startsWith(this.prefix)) {
      other = other.slice(this.prefix.length);
    }
    if (this.suffix.length > 0 && other.endsWith(this.suffix)) {
      other = other.slice(0, -this.suffix.length);
    }
    if (other.length === 0) {
      return false;
    }

    if (this.name.length > 0) {
      if (this.splat) {
        if (params[this.name] === undefined) {
          params[this.name] = [other];
        } else {
          params[this.name].push(other);
        }
      } else {
        if (params[this.name] !== undefined) {
          return false;
        }
        params[this.name] = other;
      }
    }
    return true;
  }

  matchesEmptyIn(params) {
    if (this.splat) {
      if (params[this.name] === undefined) {
        params[this.name] = [];
      }
      return true;
    }

    return false;
  }

  isSplat() {
    return this.splat;
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
  if (prefix.length > 0 && subPattern.startsWith(prefix)) {
    subPattern = subPattern.slice(prefix.length);
  }
  if (suffix.length > 0 && subPattern.endsWith(suffix)) {
    subPattern = subPattern.slice(0, -suffix.length);
  }

  if (subPattern.startsWith('-a') && subPattern.endsWith('-z')) {
    const splat = subPattern.endsWith('...-z');
    if (splat) {
      subPattern = subPattern.slice(2, -5);
    } else {
      subPattern = subPattern.slice(2, -2);
    }

    return new CapturePart(dashUnescape(subPattern), splat, prefix, suffix);
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

  toString() {
    let s = '<URIMatch ok';
    for (const k in this.params) {
      s += ` ${k}="${this.params[k]}"`;
    }
    s += '>';
    return s;
  }
}

const nonURIMatch = {
  ok() {
    return false;
  },

  getParams() {
    return {};
  },

  toString() {
    return '<nonURIMatch>';
  },
};
