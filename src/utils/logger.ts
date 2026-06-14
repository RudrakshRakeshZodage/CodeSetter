import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

let verbose = false;

export function setVerbose(v: boolean): void {
  verbose = v;
}

const prefix = {
  debug: chalk.gray('[debug]'),
  info: chalk.cyan('[info] '),
  warn: chalk.yellow('[warn] '),
  error: chalk.red('[error]'),
  success: chalk.green('[ ok ] '),
};

export const logger = {
  debug(msg: string, ...args: unknown[]): void {
    if (verbose) {
      console.warn(prefix.debug, msg, ...args);
    }
  },
  info(msg: string, ...args: unknown[]): void {
    console.warn(prefix.info, msg, ...args);
  },
  warn(msg: string, ...args: unknown[]): void {
    console.warn(prefix.warn, chalk.yellow(msg), ...args);
  },
  error(msg: string, ...args: unknown[]): void {
    console.error(prefix.error, chalk.red(msg), ...args);
  },
  success(msg: string, ...args: unknown[]): void {
    console.warn(prefix.success, chalk.green(msg), ...args);
  },
};
