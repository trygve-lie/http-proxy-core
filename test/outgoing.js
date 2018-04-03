'use strict';

const Outgoing = require('../lib/outgoing');
const tap = require('tap');

const setup = (obj = {}) => {
    return Object.assign({
        req: {
            headers: {
                host: 'ext-auto.com'
            }
        },
        proxyRes: {
            statusCode: 301,
            headers: {
                location: 'http://backend.com/'
            }
        },
        options: {
            target: 'http://backend.com'
        }
    }, obj);
};

const setupExtended = (obj = {}) => {
    return Object.assign({
        proxyRes: {
            headers: {
                hey: 'hello',
                how: 'are you?',
                'set-cookie': [
                    'hello; domain=my.domain; path=/',
                    'there; domain=my.domain; path=/'
                ]
            }
        },
        rawProxyRes: {
            headers: {
                hey: 'hello',
                how: 'are you?',
                'set-cookie': [
                    'hello; domain=my.domain; path=/',
                    'there; domain=my.domain; path=/'
                ]
            },
            rawHeaders: [
                'Hey', 'hello',
                'How', 'are you?',
                'Set-Cookie', 'hello; domain=my.domain; path=/',
                'Set-Cookie', 'there; domain=my.domain; path=/'
            ]
        },
        res: {
            setHeader(k, v) {
                // https://nodejs.org/api/http.html#http_message_headers
                // Header names are lower-cased
                this.headers[k.toLowerCase()] = v;
            },
            headers: {}
        }
    }, obj);
};

tap.test('.setRedirectHostRewrite() - rewrite location host - should rewrite on http code 201, 301, 302, 307 and 308', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();
    stub.options.hostRewrite = 'ext-manual.com';

    stub.proxyRes.statusCode = 201;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://ext-manual.com/');

    stub.proxyRes.statusCode = 301;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://ext-manual.com/');

    stub.proxyRes.statusCode = 302;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://ext-manual.com/');

    stub.proxyRes.statusCode = 307;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://ext-manual.com/');

    stub.proxyRes.statusCode = 308;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://ext-manual.com/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - rewrite location host - should NOT rewrite on http code 200', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();
    stub.options.hostRewrite = 'ext-manual.com';

    stub.proxyRes.statusCode = 200;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://backend.com/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - rewrite location host - should NOT rewrite when hostRewrite is unset', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();

    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://backend.com/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - hostRewrite is set and autoRewrite is true - should rewrite based on hostRewrite', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();
    stub.options.hostRewrite = 'ext-manual.com';
    stub.options.autoRewrite = true;

    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://ext-manual.com/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - rewrite location host - should NOT rewrite when the redirected location does not match target host', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();
    stub.proxyRes.statusCode = 302;
    stub.proxyRes.headers.location = 'http://some-other/';

    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://some-other/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - rewrite location host - should NOT rewrite when the redirected location does not match target port', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();
    stub.proxyRes.statusCode = 302;
    stub.proxyRes.headers.location = 'http://backend.com:8080/';

    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://backend.com:8080/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - rewrites location host with autoRewrite - should rewrite on http code 201, 301, 302, 307 and 308', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();
    stub.options.autoRewrite = true;

    stub.proxyRes.statusCode = 201;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://ext-auto.com/');

    stub.proxyRes.statusCode = 301;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://ext-auto.com/');

    stub.proxyRes.statusCode = 302;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://ext-auto.com/');

    stub.proxyRes.statusCode = 307;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://ext-auto.com/');

    stub.proxyRes.statusCode = 308;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://ext-auto.com/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - rewrites location host with autoRewrite - should NOT rewrite on http code 200', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();
    stub.options.autoRewrite = true;

    stub.proxyRes.statusCode = 200;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://backend.com/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - rewrites location host with autoRewrite - should NOT rewrite when autoRewrite is unset', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();

    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://backend.com/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - rewrites location host with autoRewrite - should NOT rewrite when the redirected location does not match target host', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();
    stub.options.autoRewrite = true;

    stub.proxyRes.statusCode = 302;
    stub.proxyRes.headers.location = 'http://some-other/';
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://some-other/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - rewrites location host with autoRewrite - should NOT rewrite when the redirected location does not match target port', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();
    stub.options.autoRewrite = true;

    stub.proxyRes.statusCode = 302;
    stub.proxyRes.headers.location = 'http://backend.com:8080/';
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://backend.com:8080/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - rewrites location protocol with protocolRewrite - should rewrite on http code 201, 301, 302, 307 and 308', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();
    stub.options.protocolRewrite = 'https';

    stub.proxyRes.statusCode = 201;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'https://backend.com/');

    stub.proxyRes.statusCode = 301;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'https://backend.com/');

    stub.proxyRes.statusCode = 302;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'https://backend.com/');

    stub.proxyRes.statusCode = 307;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'https://backend.com/');

    stub.proxyRes.statusCode = 308;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'https://backend.com/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - rewrites location protocol with protocolRewrite - should NOT rewrite on http code 200', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();
    stub.options.protocolRewrite = 'https';

    stub.proxyRes.statusCode = 200;
    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://backend.com/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - rewrites location protocol with protocolRewrite - should NOT rewrite when protocolRewrite is unset', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();

    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'http://backend.com/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - rewrites location protocol with protocolRewrite - should work together with hostRewrite', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();
    stub.options.protocolRewrite = 'https';
    stub.options.hostRewrite = 'ext-manual.com';

    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'https://ext-manual.com/');

    t.end();
});

tap.test('.setRedirectHostRewrite() - rewrites location protocol with protocolRewrite - should together with autoRewrite', (t) => {
    const httpProxy = new Outgoing();

    const stub = setup();
    stub.options.protocolRewrite = 'https';
    stub.options.autoRewrite = true;

    httpProxy.setRedirectHostRewrite(stub.req, {}, stub.proxyRes, stub.options);
    t.equal(stub.proxyRes.headers.location, 'https://ext-auto.com/');

    t.end();
});

tap.test('.setConnection() - set httpVersion to 1.0 and connection to "null" - should set "close" on connection', (t) => {
    const httpProxy = new Outgoing();

    const proxyRes = { headers: {} };

    httpProxy.setConnection({
        httpVersion: '1.0',
        headers: {
            connection: null
        }
    }, {}, proxyRes);

    t.equal(proxyRes.headers.connection, 'close');

    t.end();
});

tap.test('.setConnection() - set httpVersion to 1.0 and connection to a value - should set the value on connection', (t) => {
    const httpProxy = new Outgoing();

    const proxyRes = { headers: {} };

    httpProxy.setConnection({
        httpVersion: '1.0',
        headers: {
            connection: 'hey'
        }
    }, {}, proxyRes);

    t.equal(proxyRes.headers.connection, 'hey');

    t.end();
});

tap.test('.setConnection() - set httpVersion to "null" and connection to a value - should set the value on connection', (t) => {
    const httpProxy = new Outgoing();

    const proxyRes = { headers: {} };

    httpProxy.setConnection({
        httpVersion: null,
        headers: {
            connection: 'hola'
        }
    }, {}, proxyRes);

    t.equal(proxyRes.headers.connection, 'hola');

    t.end();
});

tap.test('.setConnection() - set httpVersion to "null" and connection to "null" - should set "keep-alive" as value on connection', (t) => {
    const httpProxy = new Outgoing();

    const proxyRes = { headers: {} };

    httpProxy.setConnection({
        httpVersion: null,
        headers: {
            connection: null
        }
    }, {}, proxyRes);

    t.equal(proxyRes.headers.connection, 'keep-alive');

    t.end();
});

tap.test('.setConnection() - set httpVersion to 2.0 and connection to a value - should NOT set a value on connection', (t) => {
    const httpProxy = new Outgoing();

    const proxyRes = { headers: {} };

    httpProxy.setConnection({
        httpVersion: '2.0',
        headers: {
            connection: 'namstey'
        }
    }, {}, proxyRes);

    t.type(proxyRes.headers.connection, 'undefined');

    t.end();
});

tap.test('.setConnection() - set httpVersion to 2.0 and there is no connection - should NOT set a value on connection', (t) => {
    const httpProxy = new Outgoing();

    const proxyRes = { headers: {} };

    httpProxy.setConnection({
        httpVersion: '2.0',
        headers: {}
    }, {}, proxyRes);

    t.type(proxyRes.headers.connection, 'undefined');

    t.end();
});

tap.test('.writeStatusCode() - should write status code', (t) => {
    const httpProxy = new Outgoing();

    const proxyRes = {
        writeHead: (code) => {
            t.equal(code, 200);
            t.end();
        }
    };

    httpProxy.writeStatusCode({}, proxyRes, { statusCode: 200 });
});

tap.test('.writeHeaders() - should write headers', (t) => {
    const httpProxy = new Outgoing();
    const options = {};
    const stub = setupExtended();

    httpProxy.writeHeaders({}, stub.res, stub.proxyRes, options);

    t.equal(stub.res.headers.hey, 'hello');
    t.equal(stub.res.headers.how, 'are you?');

    t.true(stub.res.headers['set-cookie']);
    t.type(stub.res.headers['set-cookie'], 'Array');
    t.equal(stub.res.headers['set-cookie'].length, 2);

    t.end();
});

tap.test('.writeHeaders() - should write raw headers', (t) => {
    const httpProxy = new Outgoing();
    const options = {};
    const stub = setupExtended();

    httpProxy.writeHeaders({}, stub.res, stub.rawProxyRes, options);

    t.equal(stub.res.headers.hey, 'hello');
    t.equal(stub.res.headers.how, 'are you?');

    t.true(stub.res.headers['set-cookie']);
    t.type(stub.res.headers['set-cookie'], 'Array');
    t.equal(stub.res.headers['set-cookie'].length, 2);

    t.end();
});






/*
describe('lib/http-proxy/passes/web-outgoing.js', function () {


  describe('#writeHeaders', function() {


    it('does not rewrite domain', function() {
      var options = {};

      httpProxy.writeHeaders({}, this.res, this.proxyRes, options);

      expect(this.res.headers['set-cookie'])
        .to.contain('hello; domain=my.domain; path=/');
    });

    it('rewrites domain', function() {
      var options = {
        cookieDomainRewrite: 'my.new.domain'
      };

      httpProxy.writeHeaders({}, this.res, this.proxyRes, options);

      expect(this.res.headers['set-cookie'])
        .to.contain('hello; domain=my.new.domain; path=/');
    });

    it('removes domain', function() {
      var options = {
        cookieDomainRewrite: ''
      };

      httpProxy.writeHeaders({}, this.res, this.proxyRes, options);

      expect(this.res.headers['set-cookie'])
        .to.contain('hello; path=/');
    });

    it('rewrites headers with advanced configuration', function() {
      var options = {
        cookieDomainRewrite: {
          '*': '',
          'my.old.domain': 'my.new.domain',
          'my.special.domain': 'my.special.domain'
        }
      };
      this.proxyRes.headers['set-cookie'] = [
        'hello-on-my.domain; domain=my.domain; path=/',
        'hello-on-my.old.domain; domain=my.old.domain; path=/',
        'hello-on-my.special.domain; domain=my.special.domain; path=/'
      ];
      httpProxy.writeHeaders({}, this.res, this.proxyRes, options);

      expect(this.res.headers['set-cookie'])
        .to.contain('hello-on-my.domain; path=/');
      expect(this.res.headers['set-cookie'])
        .to.contain('hello-on-my.old.domain; domain=my.new.domain; path=/');
      expect(this.res.headers['set-cookie'])
        .to.contain('hello-on-my.special.domain; domain=my.special.domain; path=/');
    });

    it('rewrites raw headers with advanced configuration', function() {
      var options = {
        cookieDomainRewrite: {
          '*': '',
          'my.old.domain': 'my.new.domain',
          'my.special.domain': 'my.special.domain'
        }
      };
      this.rawProxyRes.headers['set-cookie'] = [
        'hello-on-my.domain; domain=my.domain; path=/',
        'hello-on-my.old.domain; domain=my.old.domain; path=/',
        'hello-on-my.special.domain; domain=my.special.domain; path=/'
      ];
      this.rawProxyRes.rawHeaders = this.rawProxyRes.rawHeaders.concat([
        'Set-Cookie',
        'hello-on-my.domain; domain=my.domain; path=/',
        'Set-Cookie',
        'hello-on-my.old.domain; domain=my.old.domain; path=/',
        'Set-Cookie',
        'hello-on-my.special.domain; domain=my.special.domain; path=/'
      ]);
      httpProxy.writeHeaders({}, this.res, this.rawProxyRes, options);

      expect(this.res.headers['set-cookie'])
        .to.contain('hello-on-my.domain; path=/');
      expect(this.res.headers['set-cookie'])
        .to.contain('hello-on-my.old.domain; domain=my.new.domain; path=/');
      expect(this.res.headers['set-cookie'])
        .to.contain('hello-on-my.special.domain; domain=my.special.domain; path=/');
    });
  });


  describe('#removeChunked', function() {
    var proxyRes = {
      headers: {
        'transfer-encoding': 'hello'
      }
    };


    httpProxy.removeChunked({ httpVersion: '1.0' }, {}, proxyRes);

    expect(proxyRes.headers['transfer-encoding']).to.eql(undefined);
  });

});

*/
