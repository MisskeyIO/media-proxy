import type { FastifyBaseLogger } from "fastify";
declare class FastifyLogger {
    private _logger;
    set log(l: FastifyBaseLogger);
    get log(): FastifyBaseLogger;
}
export declare const fastifyLogger: FastifyLogger;
export {};
