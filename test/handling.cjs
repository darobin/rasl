/* eslint @typescript-eslint/no-require-imports: 0 */
/* global require */

const request = require('supertest');
const express = require('express');
const { default: rasl } = require('..');
const { ok } = require('node:assert');
const { Buffer } = require('node:buffer');
const { createReadStream } = require('node:fs');
const { join } = require('node:path');

const base = '/.well-known/rasl/';
const hello = 'bafkreigaknpexyvxt76zgkitavbwx6ejgfheup5oybpm77f3pxzrvwpfdi';

let app;
before(() => {
  app = express();
  app.use(rasl({
    handler: async (cid) => {
      // XXX
      // stream?: Readable,
      if (cid === 'boom') throw new Error('nope');
      if (cid === 'bredir') return { redirect: '/meow' };
      if (cid === hello) return { content: 'Hello world!' };
      if (cid === 'buffer') return { content: Buffer.from('A buffer') };
      if (cid === 'barray') return { content: new Uint8Array(Buffer.from('A typed array')) };
      if (cid === 'bstream') return { stream: createReadStream(join(__dirname, './fixtures/text.txt')) };
      return false;
    },
  }));
});
describe('Basic Handling', () => {
  it('gets a 404', async () => {
    return request(app)
      .get(`${base}bdeadb33f`)
      .expect(404)
    ;
  });
  it('heads a 404', async () => {
    return request(app)
      .head(`${base}bdeadb33f`)
      .expect(404)
    ;
  });
  it('does not touch other paths', async () => {
    return request(app)
      .get(`/meow`)
      .expect(404)
    ;
  });
  it('does not handle other methods', async () => {
    return request(app)
      .delete(`${base}${hello}`)
      .expect(404)
    ;
  });
  it('gets a 500 when crashing', async () => {
    return request(app)
      .get(`${base}boom`)
      .expect(500)
    ;
  });
  it('gets a redirect', async () => {
    return request(app)
      .get(`${base}bredir`)
      .expect(307)
      .expect('Location', '/meow')
    ;
  });
  it('heads a redirect', async () => {
    return request(app)
      .head(`${base}bredir`)
      .expect(307)
      .expect('Location', '/meow')
    ;
  });
  it('gets content', async () => {
    return request(app)
      .get(`${base}${hello}`)
      .expect(200)
      .expect('content-type', /^application\/octet-stream\b/i)
      .expect(makeBodyMatcher('Hello world!'))
    ;
  });
  it('heads content', async () => {
    return request(app)
      .head(`${base}${hello}`)
      .expect(200)
    ;
  });
  it('gets a buffer', async () => {
    return request(app)
      .get(`${base}buffer`)
      .expect(200)
      .expect('content-type', /^application\/octet-stream\b/i)
      .expect(makeBodyMatcher('A buffer'))
    ;
  });
  it('gets a typed array', async () => {
    return request(app)
      .get(`${base}barray`)
      .expect(200)
      .expect('content-type', /^application\/octet-stream\b/i)
      .expect(makeBodyMatcher('A typed array'))
    ;
  });
  it('gets a stream', async () => {
    return request(app)
      .get(`${base}bstream`)
      .expect(200)
      .expect('content-type', /^application\/octet-stream\b/i)
      .expect(makeBodyMatcher('Simple Text\n'))
    ;
  });
});

// I think that because the response isn't text it can't match using the
// usual .expect(str)
function makeBodyMatcher (str) {
  return (res) => {
    ok(res.body.toString('utf8') === str);
  }
}
