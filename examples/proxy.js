const express = require('express');
const Proxy = require('../');
const https = require('https');


// http to https
const options = {
    target: 'https://www.vg.no/nyheter/',
    autoRewrite: true,
    changeOrigin: true,
    secure: false,
};

/*
// http to http
const options = {
//    protocolRewrite: 'https',
    autoRewrite: true,

    changeOrigin: true,
    target: 'http://kkv.no/'
};
*/

const remote = new Proxy(options);


const app = express();


app.use('/', (req, res) => {
    remote.proxy(req, res);
});

app.listen(9999);
