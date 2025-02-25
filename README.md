
# @dasl/rasl — RASL for Express

RASL is a simple protocol to retrieve content-addressed data over HTTP. You can
read more in [the specification](https://dasl.ing/rasl.html), which is part of
the [DASL project](https://dasl.ing/).

## Installation

```
npm install @dasl/rasl
```

## Express Handler

```js
import rasl from '@dasl/rasl';
import express from 'express';

const app = express();

app.use(rasl({
  handler: async (cid, method) {
    // returning falsy is 404
    if (cid !== 'bafkreigaknpexyvxt76zgkitavbwx6ejgfheup5oybpm77f3pxzrvwpfdi') return false;
    // for head, return true if you have it
    if (method === 'head') return true;
    return { content: 'Hello world!' };
  },
));
```

The `rasl()` middleware is configured with an object that has a mandatory `handler` field. The
`handler` is an async function that accepts a `cid`, which is expected to be a [DASL CID](https://dasl.ing/cid.html)
(but that isn't validated, if it's invalid it shouldn't match any content you have anyway) and
`method`, which is either `get` or `head`.

The return values of the `handler` may be:

- **anything falsy**: this is a 404.
- **`true`**: the content exists (only valid for `head` requests).
- **object**: this *must* have one of `redirect`, `content`, or `stream`. (If it has several,
  they are accepted in that order.) If the `method` was `head`, these are all treated
  the same (returning an empty `200`). For `get`:
  - `redirect`: this sends a 307 redirect to the URL that matches this CID.
  - `content`: a string, `Uint8Array`, or `Buffer` with the content matching
    this CID.
  - `stream`: a `Readable` stream with the content matching this CID.

Note that `rasl` does not check that the content you provide does indeed match the CID.
That is, ultimately, the responsibility of the client.

## Serving a directory

A common usage pattern is to serve a directory. To make this easy, we provide a built-in
handler that watches a directory and will handle CID lookup correctly even as the
content of the directory (recursively) updates.

Note that, in order to do so, it has to read all of the content of the directory
(including reading every file to generate a CID). This method is therefore not
appropriate to serve directories with many files or huge ones. For that, you'll
want to pre-index the CID-to-file mapping and write a custom handler.

```js
import rasl, { makeWatchingHandler } from '@dasl/rasl';
import express from 'express';

const app = express();
app.use(rasl({
  handler: await makeWatchingHandler(absolutePathToYourWebRoot),
));
```

The handler returned by `makeWatchingHandler()` also supports a `stop()` method that
you can call if you want it to stop watching. You can use this for two reasons:

1. You know that the directory won't change. The handler will still work to look
   up CIDs but will stop watching the directory.
2. You need to wind the process down cleanly. If you don't stop the handler, it
   will keep the event loop alive.

Use it like so:

```js
const handler = await makeWatchingHandler(absolutePathToYourWebRoot);
app.use(rasl({ handler ));

// whenever you want to stop
await handler.stop();
```

## RASL Fetch

```js
import { raslFetch } from '@dasl/rasl';

const res = await raslFetch(`web+rasl://bafkreifn5yxi7nkftsn46b6x26grda57ict7md2xuvfbsgkiahe2e7vnq4;berjon.com,bumblefudge.com/`);
if (res.ok) console.log(await res.text());
```

`raslFetch()` is an equivalent of `fetch()` that fetches RASL data. If you pass it a non-RASL URL, it
just calls `fetch()` instead. It only supports `GET` and `HEAD`, and it will override a number of
options that don't make sense in a RASL context. It only supports the HTTP resolution method of RASL.

In addition to `fetch()`'s options, it supports:

- `hints`: an array of hosts to try fetching from. All hosts are raced until one returns a success code.
  By default, both the hints in the URL and those in the options are tried.
- `overrideHints`: a boolean indicating that the hints included in the URL must be ignored and only
  those given in `hints` should be used.
- `skipVerification`: a boolean indicating that the retrieved data must not be checked to see if it
  matches the given CID. **NOTE**: This is **NOT** recommended. You gain some speed but you lose the
  value of using content addressing in the first place. Use at your own risk.


## RASL URLs

```js
import { RASLURL } from '@dasl/rasl';

const url = new RASLURL(`web+rasl://bafkreifn5yxi7nkftsn46b6x26grda57ict7md2xuvfbsgkiahe2e7vnq4;berjon.com,bumblefudge.com/`);
console.log(url.cid); // bafkreifn5yxi7nkftsn46b6x26grda57ict7md2xuvfbsgkiahe2e7vnq4
console.log(url.hints); // ['berjon.com', 'bumblefudge.com']
```

`RASLURL` is a subclass of `URL` that exposes a `cid` getter/setter (for the CID part) and a `hints`
getter/setter that's an array of hints, possibly empty.
