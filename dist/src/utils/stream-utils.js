import { pipeline } from 'stream';
import { createGzip } from 'zlib';
import { promisify } from 'util';
const pipelineAsync = promisify(pipeline);
export async function compressAndPipe(readable, writable) {
    const gzip = createGzip();
    await pipelineAsync(readable, gzip, writable);
}
//# sourceMappingURL=stream-utils.js.map