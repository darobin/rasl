
# @dasl/rasl — Implementation of RASL for Express

RASL is a simple protocol to retrieve content-addressed data over HTTP. You can
read more in [the specification](https://dasl.ing/rasl.html), which is part of
the [DASL project](https://dasl.ing/).

## Installation

```
npm install @dasl/rasl
```

## Usage

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
