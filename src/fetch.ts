
import { RASLURL } from "./url.js"
import { bufferToRawCID } from "./index.js";

type RASLRequestInit = RequestInit & {
  hints?: Array<string>,
  overrideHints?: boolean,
  skipVerification?: boolean,
};

const methods = new Set(['get', 'head'])
export async function raslFetch (resource: string, options: RASLRequestInit): Promise<Response> {
  const url = new RASLURL(resource);
  if (url.protocol !== 'web+rasl:') return fetch(resource, options);
  if (options?.method && !methods.has(options.method)) throw new Error(`Method ${options.method} not supported.`);
  const hints = new Set();
  if (options?.hints) options.hints.forEach((v: string) => hints.add(v));
  if (!options?.overrideHints) url.hints.forEach((v: string) => hints.add(v));
  if (!hints.size) throw new Error(`No hints, cannot find any RASL server to try.`);
  const urls = [...hints].map(h => `https://${h}/.well-known/rasl/${url.cid}`);
  const aborts = urls.map(() => new AbortController());
  const abortOthers = (u: string) => {
    urls.forEach((value, idx) => {
      if (value === u) return;
      aborts[idx].abort();
    });
  };
  // We can't use Promise.race because we want the first 200, not the first of any kind.
  let winner: Response;
  await Promise.allSettled(urls.map(async (u, idx) => {
    // console.warn(`Fetching ${u}`);
    return fetch(u, {
      ...options,
      body: undefined,
      headers: {},
      credentials: 'omit',
      signal: aborts[idx].signal,
    }).then((res) => {
      // console.warn(`Res ${res.ok}`, res);
      if (res.ok && !winner) {
        winner = res;
        abortOthers(u);
      }
    });
  }));
  // console.warn(`values`, values);
  if (winner) {
    if (options?.skipVerification) return winner;
    const buf = await winner.arrayBuffer();
    const cid = await bufferToRawCID(new Uint8Array(buf));
    if (cid !== url.cid) throw new Error('Data does not match CID.');
    const headers = new Headers(winner.headers);
    headers.set('content-type', 'application/octet-stream');
    return new Response(buf, {
      status: winner.status,
      statusText: winner.statusText,
      headers,
    });
  }
  return new Response(null, { status: 404 });
}
