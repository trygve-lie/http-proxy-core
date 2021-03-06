'use strict';

const common = require('./common');
const url = require('url');

const redirectRegex = /^201|30(1|2|7|8)$/;

/*!
 * Array of passes.
 *
 * A `pass` is just a function that is executed on `req, res, options`
 * so that you can easily add new checks while still keeping the base
 * flexible.
 */

const Outgoing = class Outgoing {
    constructor() {

    }

    removeChunked(req, res, proxyRes) {
        if (req.httpVersion === '1.0') {
            delete proxyRes.headers['transfer-encoding'];
        }
    }

    setConnection(req, res, proxyRes) {
        if (req.httpVersion === '1.0') {
            proxyRes.headers.connection = req.headers.connection || 'close';
        } else if (req.httpVersion !== '2.0' && !proxyRes.headers.connection) {
            proxyRes.headers.connection = req.headers.connection || 'keep-alive';
        }
    }

    setRedirectHostRewrite(req, res, proxyRes, options) {
        if ((options.hostRewrite || options.autoRewrite || options.protocolRewrite)
        && proxyRes.headers.location
        && redirectRegex.test(proxyRes.statusCode)) {
            const target = url.parse(options.target);
            const u = url.parse(proxyRes.headers.location);

            // make sure the redirected host matches the target host before rewriting
            if (target.host != u.host) {
                return;
            }

            if (options.hostRewrite) {
                u.host = options.hostRewrite;
            } else if (options.autoRewrite) {
                u.host = req.headers.host;
            }
            if (options.protocolRewrite) {
                u.protocol = options.protocolRewrite;
            }

            proxyRes.headers.location = u.format();
        }
    }

    writeHeaders(req, res, proxyRes, options) {
        let rewriteCookieDomainConfig = options.cookieDomainRewrite,
            preserveHeaderKeyCase = options.preserveHeaderKeyCase,
            rawHeaderKeyMap,
            setHeader = function (key, header) {
                if (header == undefined) return;
                if (rewriteCookieDomainConfig && key.toLowerCase() === 'set-cookie') {
                    header = common.rewriteCookieDomain(header, rewriteCookieDomainConfig);
                }
                res.setHeader(String(key).trim(), header);
            };

        if (typeof rewriteCookieDomainConfig === 'string') { // also test for ''
            rewriteCookieDomainConfig = { '*': rewriteCookieDomainConfig };
        }

        // message.rawHeaders is added in: v0.11.6
        // https://nodejs.org/api/http.html#http_message_rawheaders
        if (preserveHeaderKeyCase && proxyRes.rawHeaders != undefined) {
            rawHeaderKeyMap = {};
            for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
                const key = proxyRes.rawHeaders[i];
                rawHeaderKeyMap[key.toLowerCase()] = key;
            }
        }

        Object.keys(proxyRes.headers).forEach((key) => {
            const header = proxyRes.headers[key];
            if (preserveHeaderKeyCase && rawHeaderKeyMap) {
                key = rawHeaderKeyMap[key] || key;
            }
            setHeader(key, header);
        });
    }

    writeStatusCode(req, res, proxyRes) {
    // From Node.js docs: response.writeHead(statusCode[, statusMessage][, headers])
        if (proxyRes.statusMessage) {
            res.writeHead(proxyRes.statusCode, proxyRes.statusMessage);
        } else {
            res.writeHead(proxyRes.statusCode);
        }
    }
};

module.exports = Outgoing;
