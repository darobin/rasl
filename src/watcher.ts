
import process from 'node:process';
import { join, isAbsolute } from 'node:path';
import { createReadStream } from 'node:fs';
import { readFile, access, constants } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import chokidar from 'chokidar';
import { bufferToRawCID } from './index.js';

export async function makeWatchingHandler (root: string) {
  const w = new Watcher(root);
  await w.run();
  const handler = async (cid: string, method: string) => {
    const path = w.lookup(cid);
    try {
      await access(path, constants.R_OK);
      if (method === 'head') return true;
      return { stream: createReadStream(path) };
    }
    catch (err) { // eslint-disable-line
      return false;
    }
  };
  handler.stop = async () => await w.stop();
  return handler;
}

class Watcher extends EventEmitter {
  #path: string;
  #cid2path = {};
  #path2cid = {};
  #watcher = null;
  #eventing = false;
  constructor (path: string) {
    super();
    if (!isAbsolute(path)) throw new Error(`Path must be absolute.`);
    this.#path = path;
  }
  async run () {
    return new Promise((resolve, reject) => {
      const awaitingAsyncAdds = [];
      this.#watcher = chokidar.watch(this.#path, { cwd: this.#path });
      const mapToCID = async (path: string) => {
        const buf = await readFile(path);
        const cid = await bufferToRawCID(buf);
        this.#cid2path[cid] = path;
        this.#path2cid[path] = cid;
        return cid;
      };
      const update = (type: 'add' | 'change' | 'delete', cid: string, path: string) => {
        if (!this.#eventing) return;
        process.nextTick(() => this.emit('update', this.#cid2path, type, cid, path));
      };
      this.#watcher.on('add', async (path: string) => {
        path = join(this.#path, path);
        const p = mapToCID(path);
        if (!this.#eventing) awaitingAsyncAdds.push(p);
        const cid = await p;
        update('add', cid, path);
      });
      this.#watcher.on('change', async (path: string) => {
        path = join(this.#path, path);
        if (this.#path2cid[path]) delete this.#cid2path[this.#path2cid[path]];
        const p = mapToCID(path);
        if (!this.#eventing) awaitingAsyncAdds.push(p);
        const cid = await p;
        update('change', cid, path);
      });
      this.#watcher.on('unlink', (path: string) => {
        path = join(this.#path, path);
        const cid = this.#path2cid[path];
        if (cid) delete this.#cid2path[cid];
        delete this.#path2cid[path];
        update('delete', cid, path);
      });
      this.#watcher.on('ready', async () => {
        await Promise.all(awaitingAsyncAdds);
        process.nextTick(() => {
          this.#eventing = true;
          resolve(this.#cid2path);
        });
      });
      this.#watcher.on('error', reject);
    });
  }
  lookup (cid: string) {
    return this.#cid2path[cid];
  }
  cidMap () {
    return this.#cid2path;
  }
  async stop () {
    return this.#watcher.close();
  }
}
