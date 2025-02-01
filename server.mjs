import { fastify } from 'fastify';
import closeWithGrace from 'close-with-grace';
import config from './config.js';
import app from './built/index.js';

const fastifyInstance = fastify({
    logger: true,
    maxParamLength: 1024,
});

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
