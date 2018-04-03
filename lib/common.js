'use strict';

const required = require('requires-port');
const url = require('url');

const COOKIE_DOMAIN_REGEX = /(;\s*domain=)([^;]+)/i;
const UPGRADE_HEADER = /(^|,)\s*upgrade\s*($|,)/i;
const IS_SSL = /^https|wss/;


/**
 * Check the host and see if it potentially has a port in it (keep it simple)
 *
 * @returns {Boolean} Whether we have one or not
 *
 * @api private
 */

function hasPort(host) {
    return !!~host.indexOf(':');
}


/**
 * Simple Regex for testing if protocol is https
 */

module.exports.isSSL = IS_SSL;


/**
 * OS-agnostic join (doesn't break on URLs like path.join does on Windows)>
 *
 * @return {String} The generated path.
 *
 * @api private
 */

const urlJoin = (...args) => {
    //
    // We do not want to mess with the query string. All we want to touch is the path.
    //
    const lastIndex = args.length - 1;
    const last = args[lastIndex];
    const lastSegs = last.split('?');

    args[lastIndex] = lastSegs.shift();

    //
    // Join all strings, but remove empty strings so we don't get extra slashes from
    // joining e.g. ['', 'am']
    //
    const retSegs = [
        args.filter(Boolean).join('/')
            .replace(/\/+/g, '/')
            .replace('http:/', 'http://')
            .replace('https:/', 'https://')
    ];

    // Only join the query string if it exists so we don't have trailing a '?'
    // on every request

    // Handle case where there could be multiple ? in the URL.
    retSegs.push(...lastSegs);

    return retSegs.join('?');
};


/**
 * Copies the right headers from `options` and `req` to
 * `outgoing` which is then used to fire the proxied
 * request.
 *
 * Examples:
 *
 *    common.setupOutgoing(outgoing, options, req)
 *    // => { host: ..., hostname: ...}
 *
 * @param {Object} Outgoing Base object to be filled with required properties
 * @param {Object} Options Config object passed to the proxy
 * @param {ClientRequest} Req Request Object
 * @param {String} Forward String to select forward or target
 *
 * @return {Object} Outgoing Object with all required properties set
 *
 * @api private
 */

const setupOutgoing = (outgoing, options, req, forward) => {
    outgoing.port = options[forward || 'target'].port ||
                  (IS_SSL.test(options[forward || 'target'].protocol) ? 443 : 80);

    [
        'host',
        'hostname',
        'socketPath',
        'pfx',
        'key',
        'passphrase',
        'cert',
        'ca',
        'ciphers',
        'secureProtocol'
    ].forEach((item) => {
        outgoing[item] = options[forward || 'target'][item];
    });

    outgoing.method = req.method;
    outgoing.headers = Object.assign({}, req.headers);

    if (options.headers) {
        outgoing.headers = Object.assign(outgoing.headers, options.headers);
    }

    if (options.auth) {
        outgoing.auth = options.auth;
    }

    if (options.ca) {
        outgoing.ca = options.ca;
    }

    if (IS_SSL.test(options[forward || 'target'].protocol)) {
        outgoing.rejectUnauthorized = (typeof options.secure === 'undefined') ? true : options.secure;
    }


    outgoing.agent = options.agent || false;
    outgoing.localAddress = options.localAddress;

    //
    // Remark: If we are false and not upgrading, set the connection: close. This is the right thing to do
    // as node core doesn't handle this COMPLETELY properly yet.
    //
    if (!outgoing.agent) {
        outgoing.headers = outgoing.headers || {};
        if (typeof outgoing.headers.connection !== 'string'
        || !UPGRADE_HEADER.test(outgoing.headers.connection)
        ) { outgoing.headers.connection = 'close'; }
    }


    // the final path is target path + relative path requested by user:
    const target = options[forward || 'target'];
    const targetPath = target && options.prependPath !== false
        ? (target.path || '')
        : '';

    //
    // Remark: Can we somehow not use url.parse as a perf optimization?
    //
    let outgoingPath = !options.toProxy
        ? (url.parse(req.url).path || '')
        : req.url;

    //
    // Remark: ignorePath will just straight up ignore whatever the request's
    // path is. This can be labeled as FOOT-GUN material if you do not know what
    // you are doing and are using conflicting options.
    //
    outgoingPath = !options.ignorePath ? outgoingPath : '';

    outgoing.path = urlJoin(targetPath, outgoingPath);

    if (options.changeOrigin) {
        outgoing.headers.host =
      required(outgoing.port, options[forward || 'target'].protocol) && !hasPort(outgoing.host)
          ? `${outgoing.host}:${outgoing.port}`
          : outgoing.host;
    }

    return outgoing;
};


/**
 * Set the proper configuration for sockets,
 * set no delay and set keep alive, also set
 * the timeout to 0.
 *
 * Examples:
 *
 *    common.setupSocket(socket)
 *    // => Socket
 *
 * @param {Socket} Socket instance to setup
 *
 * @return {Socket} Return the configured socket.
 *
 * @api private
 */

const setupSocket = (socket) => {
    socket.setTimeout(0);
    socket.setNoDelay(true);
    socket.setKeepAlive(true, 0);
    return socket;
};


/**
 * Check if the request has an encrypted connection.
 *
 * @param {Request} req Incoming HTTP request.
 *
 * @return {Boolean} Whether the connection is encrypted or not.
 *
 * @api private
 */
const hasEncryptedConnection = (req) => {
    return Boolean(req.connection.encrypted || req.connection.pair);
};


/**
 * Get the port number from the host. Or guess it based on the connection type.
 *
 * @param {Request} req Incoming HTTP request.
 *
 * @return {String} The port number.
 *
 * @api private
 */

const getPort = (req) => {
    const res = req.headers.host ? req.headers.host.match(/:(\d+)/) : '';
    const port = hasEncryptedConnection(req) ? '443' : '80';
    return res ? res[1] : port;
};


/**
 * Rewrites or removes the domain of a cookie header
 *
 * @param {String|Array} Header
 * @param {Object} Config, mapping of domain to rewritten domain.
 *                 '*' key to match any domain, null value to remove the domain.
 *
 * @api private
 */
const rewriteCookieDomain = (header, config) => {
    if (Array.isArray(header)) {
        return header.map((headerElement) => {
            return rewriteCookieDomain(headerElement, config);
        });
    }
    return header.replace(COOKIE_DOMAIN_REGEX, (match, prefix, previousDomain) => {
        let newDomain;
        if (previousDomain in config) {
            newDomain = config[previousDomain];
        } else if ('*' in config) {
            newDomain = config['*'];
        } else {
            // no match, return previous domain
            return match;
        }
        if (newDomain) {
            // replace domain
            return prefix + newDomain;
        }
        // remove domain
        return '';
    });
};


module.exports.setupOutgoing = setupOutgoing;
module.exports.setupSocket = setupSocket;
module.exports.getPort = getPort;
module.exports.hasEncryptedConnection = hasEncryptedConnection;
module.exports.urlJoin = urlJoin;
module.exports.rewriteCookieDomain = rewriteCookieDomain;
