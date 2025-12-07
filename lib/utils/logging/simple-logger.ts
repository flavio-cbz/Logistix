import { logger } from './logger';

export const getLogger = (_name: string) => {
    return {
        info: (msg: string, ...args: any[]) => logger.info(msg, { context: args }),
        error: (msg: string, ...args: any[]) => logger.error(msg, { context: args }),
        warn: (msg: string, ...args: any[]) => logger.warn(msg, { context: args }),
        debug: (msg: string, ...args: any[]) => logger.debug(msg, { context: args }),
    };
};
