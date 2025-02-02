class FastifyLogger {
    set log(l) {
        this._logger = l;
    }
    get log() {
        return this._logger;
    }
}
export const fastifyLogger = new FastifyLogger();
