/* eslint @typescript-eslint/no-require-imports: 0 */
/* global require, __dirname */

const request = require('supertest');
const express = require('express');
const { default: rasl, makeWatchingHandler } = require('..');
const { ok } = require('node:assert');
const { join } = require('node:path');
const { readFile } = require('node:fs/promises');

const base = '/.well-known/rasl/';
const index = 'bafkreidcmg66nzp5ldng52laqfz23h2kf6h3ftp2rv2pwnuprih2yodz4m';
const rick = 'bafkreifn5yxi7nkftsn46b6x26grda57ict7md2xuvfbsgkiahe2e7vnq4';

let app;
let handler;
let rickBuf;
before(async function () {
  this.timeout(10_000);
  app = express();
  handler = await makeWatchingHandler(join(__dirname, 'fixtures/site'));
  app.use(rasl({ handler }));
  rickBuf = await readFile(join(__dirname, 'fixtures/site/img/rick.jpg'));
});
after(async () => {
  if (!handler) return;
  await handler.watcher.stop();
})
describe('Directory watching handler', () => {
  it('gets a 404', async () => {
    return request(app)
      .get(`${base}bdeadb33f`)
      .expect(404)
    ;
  });
  it('gets index.html', async () => {
    return request(app)
      .get(`${base}${index}`)
      .expect(200)
      .expect('content-type', /^application\/octet-stream\b/i)
      .expect((res) => {
        ok(/Never Gonna Give You Up/.test(res.body.toString('utf8')));
      })
    ;
  });
  it('gets rick.jpg', async () => {
    return request(app)
      .get(`${base}${rick}`)
      .expect(200)
      .expect('content-type', /^application\/octet-stream\b/i)
      .expect((res) => {
        ok(rickBuf.equals(res.body));
      })
    ;
  });
  it('heads index.html', async () => {
    return request(app)
      .head(`${base}${index}`)
      .expect(200)
    ;
  });
});
