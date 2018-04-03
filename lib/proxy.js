
const EventEmitter = require('events');
const Incoming = require('./incoming');
const url = require('url');

const Proxy = class Proxy extends EventEmitter {
    constructor(options = {}) {
        super();

        options.prependPath = options.prependPath !== false;

        this.options = options;

        ['target', 'forward'].forEach((e) => {
            if (typeof this.options[e] === 'string') { this.options[e] = url.parse(this.options[e]); }
        });

        if (!this.options.target && !this.options.forward) {
        // return this.emit('error', new Error('Must provide a proper URL as target'));
            throw new Error('Must provide a proper URL as target');
        }


        this.passes = new Incoming();

        this.on('error', this.onError, this);
    }

    proxy(req, res, head = {}, cbl) {
        this.passes.deleteLength(req, res, this.options, head, this, cbl);
        this.passes.timeout(req, res, this.options, head, this, cbl);
        this.passes.XHeaders(req, res, this.options, head, this, cbl);
        this.passes.stream(req, res, this.options, head, this, cbl);
    }

    onError() {
        if (this.listeners('error').length === 1) {
            throw err;
        }
    }
};

module.exports = Proxy;
