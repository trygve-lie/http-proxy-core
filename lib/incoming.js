const Outgoing = require('./outgoing');
const common = require('./common');
const https = require('https');
const http = require('http');


const Incoming = class Incoming {
    constructor() {
        this.outgoing = new Outgoing();
    }

    deleteLength(req, res, options) {
        if ((req.method === 'DELETE' || req.method === 'OPTIONS')
       && !req.headers['content-length']) {
            req.headers['content-length'] = '0';
            delete req.headers['transfer-encoding'];
        }
    }

    timeout(req, res, options) {
        if (options.timeout) {
            req.socket.setTimeout(options.timeout);
        }
    }

    XHeaders(req, res, options) {
        if (!options.xfwd) return;

        const encrypted = req.isSpdy || common.hasEncryptedConnection(req);
        const values = {
            for: req.connection.remoteAddress || req.socket.remoteAddress,
            port: common.getPort(req),
            proto: encrypted ? 'https' : 'http'
        };

        ['for', 'port', 'proto'].forEach((header) => {
            req.headers[`x-forwarded-${header}`] =
        (req.headers[`x-forwarded-${header}`] || '') +
        (req.headers[`x-forwarded-${header}`] ? ',' : '') +
        values[header];
        });

        req.headers['x-forwarded-host'] = req.headers.host || '';
    }

    stream(req, res, options, _, server, clb) {
    // And we begin!
        server.emit('start', req, res, options.target || options.forward);

        if (options.forward) {
            // If forward enable, so just pipe the request
            const forwardReq = (options.forward.protocol === 'https:' ? https : http).request(common.setupOutgoing(options.ssl || {}, options, req, 'forward'));

            // error handler (e.g. ECONNRESET, ECONNREFUSED)
            // Handle errors on incoming request as well as it makes sense to
            const forwardError = createErrorHandler(forwardReq, options.forward);
            req.on('error', forwardError);
            forwardReq.on('error', forwardError);

            (options.buffer || req).pipe(forwardReq);
            if (!options.target) { return res.end(); }
        }

        // Request initalization
        const proxyReq = (options.target.protocol === 'https:' ? https : http).request(common.setupOutgoing(options.ssl || {}, options, req));

        // Enable developers to modify the proxyReq before headers are sent
        proxyReq.on('socket', (socket) => {
            if (server) { server.emit('proxyReq', proxyReq, req, res, options); }
        });

        // allow outgoing socket to timeout so that we could
        // show an error page at the initial request
        if (options.proxyTimeout) {
            proxyReq.setTimeout(options.proxyTimeout, () => {
                proxyReq.abort();
            });
        }

        // Ensure we abort proxy if request is aborted
        req.on('aborted', () => {
            proxyReq.abort();
        });

        // handle errors in proxy and incoming request, just like for forward proxy
        const proxyError = createErrorHandler(proxyReq, options.target);
        req.on('error', proxyError);
        proxyReq.on('error', proxyError);

        function createErrorHandler(proxyReq, url) {
            return function proxyError(err) {
                if (req.socket.destroyed && err.code === 'ECONNRESET') {
                    server.emit('econnreset', err, req, res, url);
                    return proxyReq.abort();
                }

                if (clb) {
                    clb(err, req, res, url);
                } else {
                    server.emit('error', err, req, res, url);
                }
            };
        }

        (options.buffer || req).pipe(proxyReq);

        proxyReq.on('response', (proxyRes) => {
            if (server) { server.emit('proxyRes', proxyRes, req, res); }

            this.outgoing.removeChunked(req, res, proxyRes, options);
            this.outgoing.setConnection(req, res, proxyRes, options);
            this.outgoing.setRedirectHostRewrite(req, res, proxyRes, options);
            this.outgoing.writeHeaders(req, res, proxyRes, options);
            this.outgoing.writeStatusCode(req, res, proxyRes, options);

            // Allow us to listen when the proxy has completed
            proxyRes.on('end', () => {
                server.emit('end', req, res, proxyRes);
            });

            proxyRes.pipe(res);
        });
    }
};

module.exports = Incoming;
