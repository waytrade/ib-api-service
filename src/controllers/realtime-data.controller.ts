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
import {firstValueFrom, Subject, Subscription} from "rxjs";
import {
  RealtimeDataError,
  RealtimeDataMessage,
  RealtimeDataMessagePayload,
  RealtimeDataMessageType,
} from "../models/realtime-data-message.model";
import {IBApiService} from "../services/ib-api.service";
import {SecurityUtils} from "../utils/security.utils";

/** Send an error to the stream */
function sendError(
  stream: MicroserviceStream,
  topic: string,
  error: RealtimeDataError,
): void {
  stream.send(
    JSON.stringify({
      topic,
      error,
    } as RealtimeDataMessage),
  );
}

/** Send a response to the stream */
function sendReponse(
  stream: MicroserviceStream,
  topic: string,
  data?: RealtimeDataMessagePayload,
  type?: RealtimeDataMessageType,
): void {
  stream.send(
    JSON.stringify({
      type,
      topic,
      data,
    } as RealtimeDataMessage),
  );
}

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
      "<li>accountSummary/#</li>" +
      "<li>position/#</li>" +
      "<li>marketdata/&lt;conId&gt;</li>" +
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
      sendError(stream, "", {
        code: HttpStatus.UNAUTHORIZED,
        desc: "Authorization header or auth argument missing",
      });
      stream.close();
      return;
    }

    try {
      SecurityUtils.ensureAuthorization({
        headers: requestHeader,
      } as MicroserviceRequest);
    } catch (e) {
      sendError(stream, "", {
        code: HttpStatus.UNAUTHORIZED,
        desc: "Not authorized",
      });
      stream.close();
      return;
    }

    this.processMessages(stream);
  }

  /** Process messages on a realtime data stream. */
  private processMessages(stream: MicroserviceStream): void {
    const subscriptionCancelSignals = new MapExt<string, Subject<void>>();

    // handle incomming messages

    stream.onReceived = (data: string): void => {
      let msg: WaytradeEventMessage;
      try {
        msg = JSON.parse(data) as WaytradeEventMessage;
      } catch (e) {
        sendError(stream, "", {
          code: HttpStatus.BAD_REQUEST,
          desc: (e as Error).message,
        });
        return;
      }

      if (msg.type === WaytradeEventMessageType.Subscribe && msg.topic) {
        // handle subscribe requests
        let subscriptionCancelSignal = subscriptionCancelSignals.get(msg.topic);
        const previousSubscriptionCancelSignal = subscriptionCancelSignal;
        if (!subscriptionCancelSignal) {
          subscriptionCancelSignal = new Subject<void>();
        }

        subscriptionCancelSignals.set(msg.topic, subscriptionCancelSignal);
        previousSubscriptionCancelSignal?.next();

        firstValueFrom(this.shutdown).then(() =>
          subscriptionCancelSignal?.next(),
        );

        this.startSubscription(
          msg.topic,
          stream,
          subscriptionCancelSignal,
          subscriptionCancelSignals,
        );
      } else if (msg.type === WaytradeEventMessageType.Unsubscribe) {
        // handle unsubscribe requests
        subscriptionCancelSignals.get(msg.topic)?.next();
        subscriptionCancelSignals.delete(msg.topic);
      } else {
        sendError(stream, msg.topic, {
          code: HttpStatus.BAD_REQUEST,
          desc: `Invalid message type: ${msg.type}`,
        });
      }
    };

    // cancel all subscriptions on connection drop

    stream.closed.then(() => {
      subscriptionCancelSignals.forEach(s => s.next());
    });
  }

  /** Start a realtime data subscription. */
  private startSubscription(
    topic: string,
    stream: MicroserviceStream,
    cancel: Subject<void>,
    subscriptionMap: MapExt<string, Subject<void>>,
  ): void {
    function handleSubscriptionError(desc: string): void {
      subscriptionMap.delete(topic);
      sendError(stream, topic, {
        code: HttpStatus.BAD_REQUEST,
        desc,
      });
    }

    // handle subscription requests:
    const topicTokens = topic.split("/");

    let sub$: Subscription | undefined = undefined;

    // account summariies
    if (topicTokens[0] === "accountSummary") {
      const accountId = topicTokens[1];
      if (accountId !== "#") {
        sendError(stream, topic, {
          code: HttpStatus.BAD_REQUEST,
          desc: "invalid topic, only 'accountSummary/#' wildcard supported",
        });
        return;
      }

      sub$ = this.apiService.accountSummaries.subscribe({
        next: update => {
          update.forEach(summary => {
            sendReponse(stream, topicTokens[0] + "/" + summary.account, {
              accountSummary: summary,
            });
          });
        },
        error: err => handleSubscriptionError((<Error>err).message),
      });
    }

    // position
    else if (topicTokens[0] === "position") {
      const posId = topicTokens[1];
      if (posId !== "#") {
        sendError(stream, topic, {
          code: HttpStatus.BAD_REQUEST,
          desc: "invalid topic, only 'position/#' wildcard supported",
        });
        return;
      }

      sub$ = this.apiService.positions.subscribe({
        next: update => {
          update.changed?.forEach(position => {
            sendReponse(stream, topicTokens[0] + "/" + position.id, {
              position,
            });
          });

          update.closed?.forEach(position => {
            sendReponse(
              stream,
              topicTokens[0] + "/" + position.id,
              undefined,
              RealtimeDataMessageType.Unpublish,
            );
          });
        },
        error: err => handleSubscriptionError((<Error>err).message),
      });
    }

    // marketdata
    else if (topicTokens[0] == "marketdata") {
      const conId = Number(topicTokens[1]);
      if (isNaN(conId)) {
        handleSubscriptionError("conId is not a number");
        return;
      }
      sub$ = this.apiService.getMarketData(conId).subscribe({
        next: update =>
          sendReponse(stream, topic, {
            marketdata: update,
          }),
        error: err => handleSubscriptionError((<Error>err).message),
      });
    }

    // invalid topic
    else {
      handleSubscriptionError("invalid topic");
    }

    firstValueFrom(cancel).then(() => sub$?.unsubscribe());
  }
}
