/**
 * Read POST body as raw UTF-8 for /iclock routes.
 * ZKTeco devices often send odd or missing Content-Type; express.text() may not parse.
 */
const MAX_BYTES = 10 * 1024 * 1024;

function zktecoCaptureRawBody(req, res, next) {
    if (req.method !== 'POST') {
        return next();
    }
    const chunks = [];
    let total = 0;
    let tooLarge = false;
    req.on('data', (chunk) => {
        if (tooLarge) return;
        total += chunk.length;
        if (total > MAX_BYTES) {
            tooLarge = true;
            res.status(413).type('text/plain').send('Payload Too Large');
            return;
        }
        chunks.push(chunk);
    });
    req.on('end', () => {
        if (tooLarge) return;
        req.body = chunks.length ? Buffer.concat(chunks).toString('utf8') : '';
        next();
    });
    req.on('error', (err) => next(err));
}

module.exports = zktecoCaptureRawBody;
