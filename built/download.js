import * as fs from 'node:fs';
import * as stream from 'node:stream';
import * as util from 'node:util';
import ipaddr from 'ipaddr.js';
import got, * as Got from 'got';
import { fastifyLogger } from './logger.js';
import { StatusError } from './status-error.js';
import { getAgents } from './http.js';
import { parse } from 'content-disposition';
const pipeline = util.promisify(stream.pipeline);
export const defaultDownloadConfig = {
    userAgent: `MisskeyMediaProxy/0.0.0`,
    allowedPrivateNetworks: [],
    maxSize: 262144000,
    proxy: false,
    ...getAgents()
};
export async function downloadUrl(url, path, settings = defaultDownloadConfig) {
    fastifyLogger.log.info(`Downloading ${url} to ${path} ...`);
    const timeout = 30 * 1000;
    const operationTimeout = 60 * 1000;
    const urlObj = new URL(url);
    let filename = urlObj.pathname.split('/').pop() ?? 'unknown';
    const req = got.stream(url, {
        headers: {
            'User-Agent': settings.userAgent,
        },
        timeout: {
            lookup: timeout,
            connect: timeout,
            secureConnect: timeout,
            socket: timeout, // read timeout
            response: timeout,
            send: timeout,
            request: operationTimeout, // whole operation timeout
        },
        agent: {
            http: settings.httpAgent,
            https: settings.httpsAgent,
        },
        http2: true,
        retry: {
            limit: 0,
        },
        enableUnixSockets: false,
    }).on('response', (res) => {
        if ((process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') && !settings.proxy && res.ip) {
            if (isPrivateIp(res.ip, settings.allowedPrivateNetworks)) {
                fastifyLogger.log.warn({ url }, `Access to private IP address (${res.ip}) is blocked`);
                req.destroy();
            }
        }
        const contentLength = res.headers['content-length'];
        if (contentLength != null) {
            const size = Number(contentLength);
            if (size > settings.maxSize) {
                fastifyLogger.log.warn({ url }, `maxSize exceeded (${size} > ${settings.maxSize}) on response`);
                req.destroy();
            }
        }
        const contentDisposition = res.headers['content-disposition'];
        if (contentDisposition != null) {
            try {
                const parsed = parse(contentDisposition);
                if (parsed.parameters.filename) {
                    filename = parsed.parameters.filename;
                }
            }
            catch (e) {
                fastifyLogger.log.warn({ url, error: e }, `Failed to parse content-disposition: ${contentDisposition}`);
            }
        }
    }).on('downloadProgress', (progress) => {
        if (progress.transferred > settings.maxSize) {
            fastifyLogger.log.warn({ url }, `maxSize exceeded (${progress.transferred} > ${settings.maxSize}) on downloadProgress`);
            req.destroy();
        }
    });
    try {
        await pipeline(req, fs.createWriteStream(path));
    }
    catch (e) {
        if (e instanceof Got.HTTPError) {
            throw new StatusError(`${e.response.statusCode} ${e.response.statusMessage}`, e.response.statusCode, e.response.statusMessage);
        }
        else {
            throw e;
        }
    }
    fastifyLogger.log.info(`Download finished: ${url}`);
    return {
        filename,
    };
}
function isPrivateIp(ip, allowedPrivateNetworks) {
    const parsedIp = ipaddr.parse(ip);
    for (const net of allowedPrivateNetworks ?? []) {
        if (parsedIp.match(ipaddr.parseCIDR(net))) {
            return false;
        }
    }
    return parsedIp.range() !== 'unicast';
}
