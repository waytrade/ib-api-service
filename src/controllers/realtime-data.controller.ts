import {
  controller,
  description,
  HttpStatus,
  inject,
  MapExt,
  MicroserviceRequest,
  MicroserviceStream,
  queryParameter,
  responseBody,
  summary,
  websocket,
} from "@waytrade/microservice-core";
import {
  WaytradeEventMessage,
  WaytradeEventMessageType,
} from "@waytrade/microservice-core/dist/vendor/waytrade";
import {firstValueFrom, Subject} from "rxjs";
import {RealtimeDataMessage} from "../models/realtime-data-message.model";
import {IBApiService} from "../services/ib-api.service";
import {SecurityUtils} from "../utils/security.utils";

/** The Real-time Data controller. */
@controller("Real-time Data", "/realtime")
export class RealtimeDataController {
  @inject("IBApiService")
  private apiService!: IBApiService;

  /** Shutdown signal */
  private shutdown = new Subject<void>();

  /** Shutdown the controller. */
  stop(): void {
    this.shutdown.next();
  }

  @websocket("/stream")
  @summary("Create a stream to receive real-time data.")
  @description(
    "Upgrade the connection to a WebSocket to send and receive real-time data messages.</br></br>" +
      "To subscribe on a message topic, send a LiveDataMessage with a valid topic attribute and type='subscribe'.</br>" +
      "To unsubscribe from a message topic, send a LiveDataMessage with a valid topic attribute and type='unsubscribe'</br>" +
      "</br>Avaiable message topics:</br><ul>" +
      "<li>accountSummaries</li>" +
      "<li>positions</li>" +
      "</ul>",
  )
  @queryParameter("auth", String, false, "The authorization token.")
  @responseBody(RealtimeDataMessage)
  @responseBody(RealtimeDataMessage)
  createStream(stream: MicroserviceStream): void {
    // enusre authorization

    const authTokenOverwrite = new URL(
      stream.url,
      "http://127.0.0.1",
    ).searchParams.get("auth");

    const requestHeader = new Map<string, string>(stream.requestHeader);
    if (authTokenOverwrite) {
      requestHeader.set("authorization", authTokenOverwrite);
    }

    if (!requestHeader.has("authorization")) {
      stream.send(
        JSON.stringify({
          error: {
            code: HttpStatus.UNAUTHORIZED,
            desc: "Authorization header or auth argument missing",
          },
        } as WaytradeEventMessage),
      );
      stream.close();
      return;
    }

    try {
      SecurityUtils.ensureAuthorization({
        headers: requestHeader,
      } as MicroserviceRequest);
    } catch (e) {
      stream.send(
        JSON.stringify({
          error: {
            code: HttpStatus.UNAUTHORIZED,
            desc: "Not authorized",
          },
        } as WaytradeEventMessage),
      );
      stream.close();
      return;
    }

    const subscriptionCancelSignals = new MapExt<string, Subject<void>>();

    // handle incomming messages

    stream.onReceived = (data: string): void => {
      let msg: WaytradeEventMessage;
      try {
        msg = JSON.parse(data) as WaytradeEventMessage;
      } catch (e) {
        stream.send(
          JSON.stringify({
            error: {
              code: HttpStatus.BAD_REQUEST,
              desc: (e as Error).message,
            },
          } as WaytradeEventMessage),
        );
        return;
      }

      if (msg.type === WaytradeEventMessageType.Subscribe && msg.topic) {
        // handle subscribe requests

        let subscriptionCancelSignal = subscriptionCancelSignals.get(msg.topic);
        const previousSubscriptionCancelSignal = subscriptionCancelSignal;

        subscriptionCancelSignal = new Subject<void>();
        firstValueFrom(this.shutdown).then(() =>
          subscriptionCancelSignal?.next(),
        );

        this.startSubscription(msg.topic, stream, subscriptionCancelSignal);

        subscriptionCancelSignals.set(msg.topic, subscriptionCancelSignal);
        previousSubscriptionCancelSignal?.next();
      } else if (msg.type === WaytradeEventMessageType.Unsubscribe) {
        // handle unsubscribe requests

        subscriptionCancelSignals.get(msg.topic)?.next();
        subscriptionCancelSignals.delete(msg.topic);
      }
    };

    // cancel all subscriptions on connection drop

    stream.closed.then(() => {
      subscriptionCancelSignals.forEach(s => s.next());
    });
  }

  private startSubscription(
    topic: string,
    stream: MicroserviceStream,
    cancel: Subject<void>,
  ): void {
    if (topic === "accountSummaries") {
      const sub$ = this.apiService.accountSummaries.subscribe({
        next: update => {
          const msg: RealtimeDataMessage = {
            topic,
            data: {
              accountSummaries: update,
            },
          };
          stream.send(JSON.stringify(msg));
        },
      });
      firstValueFrom(cancel).then(() => sub$.unsubscribe());
    } else if (topic === "positions") {
      const sub$ = this.apiService.positions.subscribe({
        next: update => {
          const msg: RealtimeDataMessage = {
            topic,
            data: {
              positions: update,
            },
          };
          stream.send(JSON.stringify(msg));
        },
      });
      firstValueFrom(cancel).then(() => sub$.unsubscribe());
    }
  }
}
