
/* eslint @typescript-eslint/no-require-imports: 0 */
/* global require */

const { RASLURL } = require('..')
const { equal, deepEqual } = require('node:assert');

const rick = 'bafkreifn5yxi7nkftsn46b6x26grda57ict7md2xuvfbsgkiahe2e7vnq4';
const index = 'bafkreidcmg66nzp5ldng52laqfz23h2kf6h3ftp2rv2pwnuprih2yodz4m';

describe('RASL URLs', () => {
  it('parses a URL', async () => {
    const url = new RASLURL(`web+rasl://${rick};berjon.com,bumblefudge.com/`);
    equal(rick, url.cid, 'CID parsed');
    deepEqual(['berjon.com', 'bumblefudge.com'], url.hints, 'hints parsed');
  });
  it('no hints', async () => {
    const url = new RASLURL(`web+rasl://${rick}/`);
    equal(rick, url.cid, 'CID parsed');
    deepEqual([], url.hints, 'absence of hints parsed');
  });
  it('parses with encoding considerations', async () => {
    const url = new RASLURL(`web+rasl://${rick};${encodeURIComponent('localhost:8080')},${encodeURIComponent('127.0.0.1:42')},${encodeURIComponent('[::1]:443')}/`);
    equal(rick, url.cid, 'CID parsed ');
    deepEqual(['localhost:8080', '127.0.0.1:42', '[::1]:443'], url.hints, 'hints parsed');
  });
  it('sets the CID', async () => {
    const url = new RASLURL(`web+rasl://${rick};berjon.com,bumblefudge.com/`);
    url.cid = index;
    equal(index, url.cid, 'CID updated');
    deepEqual(['berjon.com', 'bumblefudge.com'], url.hints, 'hints remained');
  });
  it('sets the hints', async () => {
    const url = new RASLURL(`web+rasl://${rick};berjon.com,bumblefudge.com/`);
    url.hints = ['localhost:8080', '127.0.0.1:42'];
    equal(rick, url.cid, 'CID remained');
    deepEqual(['localhost:8080', '127.0.0.1:42'], url.hints, 'hints updated');
  });
});
