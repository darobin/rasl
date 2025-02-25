
/* eslint @typescript-eslint/no-require-imports: 0 */
/* global require, process */

const { raslFetch, default: rasl } = require('..')
const { default: getPort } = require('get-port');
const express = require('express');
const https = require("https");
const { createCA, createCert } = require('mkcert');
const { equal, ok, rejects } = require('node:assert');

// don't try this at home, kids
process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

const rick = 'bafkreifn5yxi7nkftsn46b6x26grda57ict7md2xuvfbsgkiahe2e7vnq4';
const cidForOk = 'bafkreibgre3hwic4c3hdf3kcackcxc4ldytc37dq3g6j7pdxysljtjhr34';

let good = {}, bad ={};
before(async () => {
  const ca = await createCA({
    organization: "RASL Your DASL",
    countryCode: "AU",
    state: "Tasmania",
    locality: "Deadloch",
    validity: 365,
  });
  const cert = await createCert({
    ca: { key: ca.key, cert: ca.cert },
    domains: ["localhost"],
    validity: 365,
  });
  for (const it of [good, bad]) {
    it.port = await getPort();
    it.app = express();
    it.hint = `localhost:${it.port}`;
    it.server = https.createServer({ key: cert.key, cert: cert.cert }, it.app);
    await new Promise((resolve) => {
      it.server.listen(it.port, resolve);
    });
  }
  good.app.use(rasl({
    handler: async () => { return { content: 'ok' } },
  }));
  bad.app.use(rasl({
    handler: async () => { return false },
  }));
});
after(async () => {
  for (const it of [good, bad]) {
    if (it.server) {
      await new Promise((resolve) => {
        it.server.close(resolve);
      });
    }
  }
});
describe('Fetch', () => {
  it('fails without hints', async () => {
    rejects(
      async () => await raslFetch(makeURL()),
      { message: `No hints, cannot find any RASL server to try.` },
      'rejects absent a hint'
    );
  });
  it('fails for the wrong method', async () => {
    rejects(
      async () => await raslFetch(makeURL([good.hint]), { method: 'post' }),
      { message: `Method post not supported.` },
      'rejects bad method'
    );
  });
  it('can take a hint', async () => {
    const res = await raslFetch(makeURL([good.hint]));
    ok(res.ok, 'got it good');
    equal('ok', await res.text(), 'got the value');
  });
  it('can take a hint from the options', async () => {
    const res = await raslFetch(makeURL(), { hints: [good.hint] });
    ok(res.ok, 'got it good');
    equal('ok', await res.text(), 'got the value');
  });
  it('can take two hints', async () => {
    const res = await raslFetch(makeURL([bad.hint, good.hint]));
    ok(res.ok, 'got it good');
    equal('ok', await res.text(), 'got the value');
  });
  it('can take a bad hint', async () => {
    const res = await raslFetch(makeURL([bad.hint]));
    ok(!res.ok, 'got it bad');
  });
  it('can override a hint', async () => {
    const res = await raslFetch(makeURL([good.hint]), { hints: [bad.hint], overrideHints: true });
    ok(!res.ok, 'got it bad');
  });
  it('verifies the CID', async () => {
    rejects(
      async () => await raslFetch(makeURL([good.hint], rick)),
      { message: 'Data does not match CID.' },
      'rejects bad data'
    );
  });
  it('skips verification if asked', async () => {
    const res = await raslFetch(makeURL([good.hint], rick), { skipVerification: true });
    ok(res.ok, 'got it good');
    equal('ok', await res.text(), 'got the value');
  });
});

function makeURL (hints = [], cid) {
  if (!hints.length) return `web+rasl://${cid || cidForOk}`;
  return `web+rasl://${cid || cidForOk};${hints.map(encodeURIComponent).join(',')}`;
}
