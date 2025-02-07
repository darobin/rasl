
import { Request, Response, NextFunction } from "express";
import { Readable } from "node:stream";

type RASLAction = {
  redirect?: string,
  content?: Uint8Array | string | Buffer,
  stream?: Readable,
};
type RASLCallback = (cid: string, method: string) => Promise<true | false | undefined | null | RASLAction>
type RASLOptions = {
  handler: RASLCallback,
};
type ExpressNextable = (req: Request, res: Response, next: NextFunction) => void;

const rx: RegExp = /^\/\.well-known\/rasl\/(b[a-z2-7=]+)$/;
const acceptedMethods = new Set(['get', 'head']);

export default function rasl (options: RASLOptions): ExpressNextable {
  if (!options.handler) throw new Error('Must provide a handler to rasl.');
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const match = req.originalUrl.match(rx);
    if (!match) return next();
    const cid = match[1];
    const method = req.method ? req.method.toLowerCase() : 'get';
    if (!acceptedMethods.has(method)) return next();
    try {
      const data = await options.handler(cid, method);
      if (data === true) {
        if (method !== 'head') throw new Error(`RASL handler returned true but method is ${method}`);
        res.sendStatus(200);
        return;
      }
      if (!data || !(data.redirect || data.content || data.stream)) {
        res.sendStatus(404);
        return;
      }
      if (method === 'head') {
        res.sendStatus(200);
        return;
      }
      if (data.redirect) {
        res.redirect(307, data.redirect);
        return;
      }
      res.type('application/octet-stream');
      if (data.stream) {
        data.stream.pipe(res);
        return;
      }
      res.send(data.content);
    }
    catch (err) { // eslint-disable-line
      res.sendStatus(500);
      return;
    }
  };
}
