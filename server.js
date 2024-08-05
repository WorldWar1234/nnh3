#!/usr/bin/env node
'use strict';

const Fastify = require('fastify');
const { request } = require('undici');
const authenticate = require('./src/authenticate');
const params = require('./src/params');
const compress = require('./src/compress');
const shouldCompress = require('./src/shouldCompress');
const redirect = require('./src/redirect');
//const bypass = require('./src/bypass'); removed 'cause of proxy like behaviour

const fastify = Fastify();
const PORT = process.env.PORT || 8080;

fastify.get('/', { preHandler: [authenticate, params] }, async (req, res) => {
    const url = req.params.url;

    const { statusCode, headers, body } = await request(url, { method: 'GET' });

    if (statusCode >= 400) {
        // Send an error response if there is a bad status code
        res.status(500).send('Error fetching the image.');
        return;
    }

  /*  if (statusCode >= 300 && headers.location) {
        // Handle redirects
        req.params.url = headers.location;
        return redirect(req, res);
    } */

    req.params.originType = headers['content-type'] || '';
    req.params.originSize = parseInt(headers['content-length'], 10);

    const arrayBuffer = await body.arrayBuffer();
const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Node.js Buffer
 

    if (shouldCompress(req)) {
    compress(req, res, buffer); // Correct usage
  } else {
    redirect(req, res);
    }
});

fastify.get('/favicon.ico', (req, res) => res.status(204).send());

fastify.listen({ port: PORT }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Listening on ${address}`);
});
