
import { Request, Response, NextFunction } from "express";

type RASLCallback = (cid: string, method: string) => Promise<false | undefined | Uint8Array | string | Buffer>
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
      if (!data) {
        res.sendStatus(404);
        return;
      }
      // XXX
      // - set up response headers
      // - return data if get, nothing if head
    }
    catch (err) { // eslint-disable-line
      res.sendStatus(500);
      return;
    }
  };
}
