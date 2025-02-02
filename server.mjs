import { fastify } from 'fastify';
import { pino } from 'pino';
import closeWithGrace from 'close-with-grace';
import config from './config.js';
import app from './built/index.js';
import { fastifyLogger } from './built/logger.js';

const fastifyInstance = fastify({
    logger: {
        serializers: {
            ...pino.stdSerializers,
            err: pino.stdSerializers.errWithCause,
        },
        level: process.env.FASTIFY_LOG_LEVEL || (process.env.NODE_ENV !== 'production' ? 'info' : 'warn'),
        depthLimit: 8,
        edgeLimit: 128,
        messageKey: 'message',
        errorKey: 'error',
        formatters: {
            level: (label, number) => ({ severity: label, level: number }),
        },
    },
    maxParamLength: 1024,
});

fastifyLogger.log = fastifyInstance.log;
fastifyInstance.register(app, { ...config });

// noinspection JSCheckFunctionSignatures
closeWithGrace({ delay: process.env.FASTIFY_CLOSE_GRACE_DELAY || 500 }, async function ({ signal, err, manual }) {
    if (err) {
        fastifyInstance.log.error(err);
    }
    await fastifyInstance.close();
});

fastifyInstance.listen({ port: process.env.PORT || 3000, host: '::' }, (err) => {
    if (err) {
        fastifyInstance.log.error(err);
        process.exit(1);
    }
});
