import {MapExt, MicroserviceStream} from "@waytrade/microservice-core";
import {Observable, Subscription} from "rxjs";
import {IBApiError} from "../../models/error";
import {IBApiService} from "../../services/ib-api-service";
import {IBApiEventType, IBApiEventTypeSources} from "../ib-api.controller";

/**
 * A helper class this dispatch to events from a source Observable to
 * an event-stream.
 */
export class EventDispatcher {
  constructor(
    private source: Observable<unknown>,
    private stream: MicroserviceStream,
    private type: IBApiEventType,
  ) {}

  /** Subscription on the source stream. */
  private source$?: Subscription;

  /** Start dispatching events. */
  start(): void {
    this.source$ = this.source.subscribe({
      next: event => {
        const obj: Record<string, unknown> = {};
        obj[this.type] = event;
        this.stream.send(JSON.stringify(obj));
      },
    });
  }

  /** Stop dispathcing events. */
  stop(): void {
    this.source$?.unsubscribe();
    delete this.source$;
  }
}

/** An event-stream channel to a client. */
export class EventStreamChannel {
  constructor(
    private stream: MicroserviceStream,
    private ibApiService: IBApiService,
  ) {}

  /** Map of all subscriptions on IBApiService with eventType:args as key.*/
  private subscriptions = new MapExt<string, Subscription>();

  /** Close the channel. */
  close(): void {
    this.subscriptions.forEach(s => {
      s.unsubscribe();
    });
    this.subscriptions.clear();
    this.stream.close();
  }

  /** Subscribe on an given event type */
  subscribeEvents(eventType: IBApiEventType, args: string[]): void {
    const key = `${eventType}:${JSON.stringify(args)}`;

    // lookup event source

    const eventSource = IBApiEventTypeSources.get(eventType);
    if (!eventSource) {
      return;
    }

    const eventSourceStream = eventSource(this.ibApiService, args);

    // re-subscribe (delayed unsubscribe on old to make sure underyling TWS
    // subscription stays open while re-subsribe on RxJS)

    const oldSubscription = this.subscriptions.get(key);
    if (oldSubscription) {
      setTimeout(() => {
        oldSubscription?.unsubscribe();
      }, 100);
    }

    const newSubscription = eventSourceStream.subscribe({
      next: update => {
        const obj: Record<string, unknown> = {};
        obj[eventType] = update;
        this.stream.send(JSON.stringify(obj));
      },
      error: err => {
        let argsStr = "";
        args.forEach(arg => (argsStr = argsStr + arg + ","));
        argsStr = argsStr.substr(0, argsStr.length - 1);
        const obj: IBApiError = {
          message: (err as Error).message,
          skey: `${eventType}:${argsStr}`,
        };
        this.stream.send(
          JSON.stringify({
            error: obj,
          }),
        );
        this.subscriptions.delete(key);
      },
    });

    this.subscriptions.set(key, newSubscription);
  }

  /** Unsubscribe from an given event type */
  unsubscribeEvents(eventType: IBApiEventType, args: string[]): void {
    const key = `${eventType}:${JSON.stringify(args)}`;
    const sub = this.subscriptions.get(key);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(key);
    }
  }
}
