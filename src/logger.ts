import type { FastifyBaseLogger } from "fastify";

class FastifyLogger {
  private _logger: FastifyBaseLogger;

  public set log(l: FastifyBaseLogger) {
    this._logger = l;
  }

  public get log(): FastifyBaseLogger {
    return this._logger;
  }
}

export const fastifyLogger = new FastifyLogger();
