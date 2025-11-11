import { pipeline } from 'stream';
import { createGzip } from 'zlib';
import { promisify } from 'util';
import { Readable, Writable } from 'stream';

const pipelineAsync = promisify(pipeline);

export async function compressAndPipe(readable: Readable, writable: Writable) {
  const gzip = createGzip();
  await pipelineAsync(readable, gzip, writable);
}
