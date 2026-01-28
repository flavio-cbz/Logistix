import { logger } from './logger';

export const getLogger = (_name: string) => {
    return {
        info: (msg: string, ...args: unknown[]) => logger.info(msg, { context: args }),
        error: (msg: string, ...args: unknown[]) => logger.error(msg, { context: args }),
        warn: (msg: string, ...args: unknown[]) => logger.warn(msg, { context: args }),
        debug: (msg: string, ...args: unknown[]) => logger.debug(msg, { context: args }),
    };
};
