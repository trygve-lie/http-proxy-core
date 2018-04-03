'use strict';

const common = require('../lib/common');
const url = require('url');
const tap = require('tap');

/**
 * .setupOutgoing()
 */

tap.test('common.setupOutgoing() - setupOutgoing - should setup the correct headers', (t) => {
    const outgoing = {};
    common.setupOutgoing(
        outgoing,
        {
            agent: '?',
            target: {
                host: 'hey',
                hostname: 'how',
                socketPath: 'are',
                port: 'you',
            },
            headers: { fizz: 'bang', overwritten: true },
            localAddress: 'local.address',
            auth: 'username:pass'
        },
        {
            method: 'i',
            url: 'am',
            headers: { pro: 'xy', overwritten: false }
        }
    );

    t.equal(outgoing.host, 'hey');
    t.equal(outgoing.hostname, 'how');
    t.equal(outgoing.socketPath, 'are');
    t.equal(outgoing.port, 'you');
    t.equal(outgoing.agent, '?');

    t.equal(outgoing.method, 'i');
    t.equal(outgoing.path, 'am');

    t.equal(outgoing.headers.pro, 'xy');
    t.equal(outgoing.headers.fizz, 'bang');
    t.equal(outgoing.headers.overwritten, true);
    t.equal(outgoing.localAddress, 'local.address');
    t.equal(outgoing.auth, 'username:pass');

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - should not override agentless upgrade header', (t) => {
    const outgoing = {};
    common.setupOutgoing(
        outgoing,
        {
            agent: undefined,
            target: {
                host: 'hey',
                hostname: 'how',
                socketPath: 'are',
                port: 'you',
            },
            headers: { connection: 'upgrade' },
        },
        {
            method: 'i',
            url: 'am',
            headers: { pro: 'xy', overwritten: false }
        }
    );

    t.equal(outgoing.headers.connection, 'upgrade');

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - should not override agentless connection: contains upgrade', (t) => {
    const outgoing = {};
    common.setupOutgoing(
        outgoing,
        {
            agent: undefined,
            target: {
                host: 'hey',
                hostname: 'how',
                socketPath: 'are',
                port: 'you',
            },
            headers: { connection: 'keep-alive, upgrade' }, // this is what Firefox sets
        },
        {
            method: 'i',
            url: 'am',
            headers: { pro: 'xy', overwritten: false }
        }
    );

    t.equal(outgoing.headers.connection, 'keep-alive, upgrade');

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - should override agentless connection: contains improper upgrade', (t) => {
    // sanity check on upgrade regex
    const outgoing = {};
    common.setupOutgoing(
        outgoing,
        {
            agent: undefined,
            target: {
                host: 'hey',
                hostname: 'how',
                socketPath: 'are',
                port: 'you',
            },
            headers: { connection: 'keep-alive, not upgrade' },
        },
        {
            method: 'i',
            url: 'am',
            headers: { pro: 'xy', overwritten: false }
        }
    );

    t.equal(outgoing.headers.connection, 'close');

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - should override agentless non-upgrade header to close', (t) => {
    const outgoing = {};
    common.setupOutgoing(
        outgoing,
        {
            agent: undefined,
            target: {
                host: 'hey',
                hostname: 'how',
                socketPath: 'are',
                port: 'you',
            },
            headers: { connection: 'xyz' },
        },
        {
            method: 'i',
            url: 'am',
            headers: { pro: 'xy', overwritten: false }
        }
    );

    t.equal(outgoing.headers.connection, 'close');

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - should set the agent to false if none is given', (t) => {
    const outgoing = {};
    common.setupOutgoing(outgoing, {
        target:
    'http://localhost'
    }, { url: '/' });

    t.false(outgoing.agent);

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - should set the port according to the protocol', (t) => {
    const outgoing = {};
    common.setupOutgoing(
        outgoing,
        {
            agent: '?',
            target: {
                host: 'how',
                hostname: 'are',
                socketPath: 'you',
                protocol: 'https:'
            }
        },
        {
            method: 'i',
            url: 'am',
            headers: { pro: 'xy' }
        }
    );

    t.equal(outgoing.host, 'how');
    t.equal(outgoing.hostname, 'are');
    t.equal(outgoing.socketPath, 'you');
    t.equal(outgoing.agent, '?');

    t.equal(outgoing.method, 'i');
    t.equal(outgoing.path, 'am');
    t.equal(outgoing.headers.pro, 'xy');

    t.equal(outgoing.port, 443);

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - should keep the original target path in the outgoing path', (t) => {
    const outgoing = {};
    common.setupOutgoing(outgoing, {
        target:
    { path: 'some-path' }
    }, { url: 'am' });

    t.equal(outgoing.path, 'some-path/am');

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - should keep the original forward path in the outgoing path', (t) => {
    const outgoing = {};
    common.setupOutgoing(outgoing, {
        target: {},
        forward: {
            path: 'some-path'
        }
    }, {
        url: 'am'
    }, 'forward');

    t.equal(outgoing.path, 'some-path/am');

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - should properly detect https/wss protocol without the colon', (t) => {
    const outgoing = {};
    common.setupOutgoing(outgoing, {
        target: {
            protocol: 'https',
            host: 'whatever.com'
        }
    }, { url: '/' });

    t.equal(outgoing.port, 443);

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - should not prepend the target path to the outgoing path with prependPath = false', (t) => {
    const outgoing = {};
    common.setupOutgoing(outgoing, {
        target: { path: 'hellothere' },
        prependPath: false
    }, { url: 'hi' });

    t.equal(outgoing.path, 'hi');

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - should properly join paths', (t) => {
    const outgoing = {};
    common.setupOutgoing(outgoing, {
        target: { path: '/forward' },
    }, { url: '/static/path' });

    t.equal(outgoing.path, '/forward/static/path');

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - should not modify the query string', (t) => {
    const outgoing = {};
    common.setupOutgoing(outgoing, {
        target: { path: '/forward' },
    }, { url: '/?foo=bar//&target=http://foobar.com/?a=1%26b=2&other=2' });

    t.equal(outgoing.path, '/forward/?foo=bar//&target=http://foobar.com/?a=1%26b=2&other=2');

    t.end();
});

//
// This is the proper failing test case for the common.join problem
//
tap.test('common.setupOutgoing() - setupOutgoing - should not modify the query string', (t) => {
    const outgoing = {};
    const google = 'https://google.com';
    common.setupOutgoing(outgoing, {
        target: url.parse('http://sometarget.com:80'),
        toProxy: true,
    }, { url: google });

    t.equal(outgoing.path, `/${google}`);

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - should not replace :\ to :\\ when no https word before', (t) => {
    const outgoing = {};
    const google = 'https://google.com:/join/join.js';
    common.setupOutgoing(outgoing, {
        target: url.parse('http://sometarget.com:80'),
        toProxy: true,
    }, { url: google });

    t.equal(outgoing.path, `/${google}`);

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - should not replace :\ to :\\ when no http word before', (t) => {
    const outgoing = {};
    const google = 'http://google.com:/join/join.js';
    common.setupOutgoing(outgoing, {
        target: url.parse('http://sometarget.com:80'),
        toProxy: true,
    }, { url: google });

    t.equal(outgoing.path, `/${google}`);

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - when using ignorePath - should ignore the path of the `req.url` passed in but use the target path', (t) => {
    const outgoing = {};
    const myEndpoint = 'https://whatever.com/some/crazy/path/whoooo';
    common.setupOutgoing(outgoing, {
        target: url.parse(myEndpoint),
        ignorePath: true
    }, { url: '/more/crazy/pathness' });

    t.equal(outgoing.path, '/some/crazy/path/whoooo');

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - when using ignorePath and prependPath: false - should ignore path of target and incoming request', (t) => {
    const outgoing = {};
    const myEndpoint = 'https://whatever.com/some/crazy/path/whoooo';
    common.setupOutgoing(outgoing, {
        target: url.parse(myEndpoint),
        ignorePath: true,
        prependPath: false
    }, { url: '/more/crazy/pathness' });

    t.equal(outgoing.path, '');

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - when using changeOrigin - should correctly set the port to the host when it is a non-standard port using url.parse', (t) => {
    const outgoing = {};
    const myEndpoint = 'https://myCouch.com:6984';
    common.setupOutgoing(outgoing, {
        target: url.parse(myEndpoint),
        changeOrigin: true
    }, { url: '/' });

    t.equal(outgoing.headers.host, 'mycouch.com:6984');

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - when using changeOrigin - should correctly set the port to the host when it is a non-standard port when setting host and port manually (which ignores port)', (t) => {
    const outgoing = {};
    common.setupOutgoing(outgoing, {
        target: {
            protocol: 'https:',
            host: 'mycouch.com',
            port: 6984
        },
        changeOrigin: true
    }, { url: '/' });

    t.equal(outgoing.headers.host, 'mycouch.com:6984');

    t.end();
});

tap.test('common.setupOutgoing() - setupOutgoing - when using changeOrigin - should pass through https client parameters', (t) => {
    const outgoing = {};
    common.setupOutgoing(
        outgoing,
        {
            agent: '?',
            target: {
                host: 'how',
                hostname: 'are',
                socketPath: 'you',
                protocol: 'https:',
                pfx: 'my-pfx',
                key: 'my-key',
                passphrase: 'my-passphrase',
                cert: 'my-cert',
                ca: 'my-ca',
                ciphers: 'my-ciphers',
                secureProtocol: 'my-secure-protocol'
            }
        },
        {
            method: 'i',
            url: 'am'
        }
    );

    t.equal(outgoing.pfx, 'my-pfx');
    t.equal(outgoing.key, 'my-key');
    t.equal(outgoing.passphrase, 'my-passphrase');
    t.equal(outgoing.cert, 'my-cert');
    t.equal(outgoing.ca, 'my-ca');
    t.equal(outgoing.ciphers, 'my-ciphers');
    t.equal(outgoing.secureProtocol, 'my-secure-protocol');

    t.end();
});

// url.parse('').path => null
tap.test('common.setupOutgoing() - setupOutgoing - when using changeOrigin - should not pass null as last arg to #urlJoin', (t) => {
    const outgoing = {};
    common.setupOutgoing(outgoing, {
        target:
    { path: '' }
    }, { url: '' });

    t.equal(outgoing.path, '');

    t.end();
});

/**
 * .setupSocket()
 */

tap.test('common.setupSocket() - setupSocket - should setup a socket', (t) => {
    const socketConfig = {
        timeout: null,
        nodelay: false,
        keepalive: false
    };
    const stubSocket = {
        setTimeout(num) {
            socketConfig.timeout = num;
        },
        setNoDelay(bol) {
            socketConfig.nodelay = bol;
        },
        setKeepAlive(bol) {
            socketConfig.keepalive = bol;
        }
    };

    common.setupSocket(stubSocket);

    t.equal(socketConfig.timeout, 0);
    t.true(socketConfig.nodelay);
    t.true(socketConfig.keepalive);

    t.end();
});
