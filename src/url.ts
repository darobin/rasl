

export class RASLURL extends URL {
  constructor (str: string) {
    super(str);
  }
  get cid () {
    if (this.protocol !== 'web+rasl:') return;
    const [cid,] = this.host.split(';', 2);
    return cid;
  }
  set cid (cid) {
    if (this.protocol !== 'web+rasl:') {
      this.host = cid;
      return;
    }
    const [,hints] = this.host.split(';', 2);
    if (hints) this.host = `${cid};${hints}`;
    else this.host = cid;
  }
  get hints () {
    if (this.protocol !== 'web+rasl:') return;
    const [,hints] = this.host.split(';', 2);
    if (!hints) return [];
    return hints.split(',').map(decodeURIComponent);
  }
  set hints (hints) {
    if (this.protocol !== 'web+rasl:') return;
    if (!Array.isArray(hints)) throw new Error('Hints must be an array');
    const [cid,] = this.host.split(';', 2);
    if (!hints.length) this.host = cid;
    else this.host = `${cid};${hints.map(encodeURIComponent).join(',')}`;
  }
}
