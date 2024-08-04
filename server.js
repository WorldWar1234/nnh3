#!/usr/bin/env node
'use strict';

const Fastify = require('fastify');
const { request } = require('undici');
const authenticate = require('./src/authenticate');
const params = require('./src/params');
const compress = require('./src/compress');
const shouldCompress = require('./src/shouldCompress');
const redirect = require('./src/redirect');
const bypass = require('./src/bypass');

const fastify = Fastify();
const PORT = process.env.PORT || 8080;

fastify.register(require('@fastify/cors'), {
  origin: '*',
  methods: ['GET'],
});

fastify.get('/', { preHandler: [authenticate, params] }, async (req, reply) => {
    const url = req.params.url;

    const { statusCode, headers, body } = await request(url, { method: 'GET' });

    if (statusCode >= 400) {
        // Send an error response if there is a bad status code
        reply.status(500).send('Error fetching the image.');
        return;
    }

    if (statusCode >= 300 && headers.location) {
        // Handle redirects
        req.params.url = headers.location;
        return redirect(req, reply);
    }

    req.params.originType = headers['content-type'] || '';
    req.params.originSize = parseInt(headers['content-length'], 10);

    /* Set common headers
    reply.header('content-encoding', 'identity');
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Cross-Origin-Resource-Policy', 'cross-origin');
    reply.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
    */

    const buffer = await body.arrayBuffer();

    if (shouldCompress(req)) {
        compress(req, reply, Buffer.from(buffer));
    } else {
        bypass(req, reply, Buffer.from(buffer));
    }
});

fastify.get('/favicon.ico', (req, reply) => reply.status(204).send());

fastify.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Listening on ${address}`);
});
