import { Buffer } from 'buffer';

// Node 25 removed SlowBuffer, but jsonwebtoken -> jws -> jwa ->
// buffer-equal-constant-time still expects it to exist.
const bufferModule = require('buffer') as { SlowBuffer?: typeof Buffer };
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = Buffer;
}
