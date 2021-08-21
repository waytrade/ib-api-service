import {Logger} from "@stoqey/ib";
import {IBApiApp} from "../app";

/**
 * Proxy to froward IBApiNext logs to into the context.
 */
export class IBApiLoggerProxy implements Logger {
  constructor(private readonly app: IBApiApp) {}

  debug(tag: string, args: string | unknown[]): void {
    this.app.debug(`[${tag}] ${args}`);
  }

  info(tag: string, args: string | unknown[]): void {
    this.app.info(`[${tag}] ${args}`);
  }

  warn(tag: string, args: string | unknown[]): void {
    this.app.warn(`[${tag}] ${args}`);
  }

  error(tag: string, args: string | unknown[]): void {
    this.app.error(`[${tag}] ${args}`);
  }
}
