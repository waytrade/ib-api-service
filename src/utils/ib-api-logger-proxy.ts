import {Logger} from "@stoqey/ib";
import {MicroserviceContext} from "@waytrade/microservice-core";

/**
 * Proxy to froward IBApiNext logs to into the context.
 */
export class IBApiLoggerProxy implements Logger {
  constructor(private readonly context: MicroserviceContext) {}

  debug(tag: string, args: string | unknown[]): void {
    this.context.debug(`[${tag}] ${args}`);
  }

  info(tag: string, args: string | unknown[]): void {
    this.context.info(`[${tag}] ${args}`);
  }

  warn(tag: string, args: string | unknown[]): void {
    this.context.warn(`[${tag}] ${args}`);
  }

  error(tag: string, args: string | unknown[]): void {
    this.context.error(`[${tag}] ${args}`);
  }
}
