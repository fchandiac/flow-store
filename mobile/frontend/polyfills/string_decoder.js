// Minimal StringDecoder polyfill so iconv-lite can run under React Native.
// It normalizes different input shapes (Uint8Array, Buffer-like, plain arrays) and
// defaults to UTF-8 since RN printing flows only send UTF-8 payloads.
class StringDecoder {
  constructor(encoding = 'utf-8') {
    this.encoding = encoding;
    this._decoder = typeof TextDecoder !== 'undefined'
      ? new TextDecoder(this.encoding)
      : null;
  }

  write(input) {
    return this._decode(input);
  }

  end(input) {
    return input ? this._decode(input) : '';
  }

  _decode(input) {
    if (!input) {
      return '';
    }

    if (typeof input === 'string') {
      return input;
    }

    if (this._decoder && input instanceof Uint8Array) {
      return this._decoder.decode(input);
    }

    if (Array.isArray(input)) {
      const array = Uint8Array.from(input);
      if (this._decoder) {
        return this._decoder.decode(array);
      }
      return String.fromCharCode(...array);
    }

    if (typeof Buffer !== 'undefined' && Buffer.from) {
      return Buffer.from(input).toString(this.encoding);
    }

    if (input.buffer instanceof ArrayBuffer) {
      const view = new Uint8Array(input.buffer);
      if (this._decoder) {
        return this._decoder.decode(view);
      }
      return String.fromCharCode(...view);
    }

    // Fallback: avoid throwing so the printer pipeline keeps running.
    return '';
  }
}

module.exports = { StringDecoder };
