import {MarketDataTick} from "@stoqey/ib";
import TickType from "@stoqey/ib/dist/api/market/tickType";
import {HttpStatus} from "@waytrade/microservice-core";
import axios from "axios";
import WebSocket from "ws";
import {
  RealtimeDataMessage,
  RealtimeDataMessageType,
} from "../../models/realtime-data-message.model";
import {IBApiApp} from "../ib-api-test-app";

describe("Test Real-time marketdata", () => {
  const TEST_USERNAME = "User" + Math.random();
  const TEST_PASSWORD = "Password" + Math.random();

  const app = new IBApiApp();

  let authToken = "";
  let streamEndpointUrl = "";
  let authenticatedStreamEndpointUrl = "";

  const TEST_CONID1 = 123451;
  const TEST_CONID2 = 123452;

  beforeAll(async () => {
    await app.start({
      SERVER_PORT: undefined,
      REST_API_USERNAME: TEST_USERNAME,
      REST_API_PASSWORD: TEST_PASSWORD,
    });

    streamEndpointUrl = `ws://localhost:${app.apiServerPort}/realtime/stream`;

    authToken = (
      await axios.post<void>(
        `http://127.0.0.1:${app.apiServerPort}/auth/password`,
        {
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
        },
      )
    ).headers["authorization"] as string;

    authenticatedStreamEndpointUrl =
      streamEndpointUrl + `?auth=${encodeURI(authToken)}`;

    app.ibApiMock.contractDb.set(TEST_CONID1, {contract: {conId: TEST_CONID1}});
    app.ibApiMock.contractDb.set(TEST_CONID2, {contract: {conId: TEST_CONID2}});
  });

  afterAll(() => {
    app.stop();
  });

  test("Subscribe on 'marketdata'", async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(authenticatedStreamEndpointUrl);
      ws.onerror = err => {
        reject(err.message);
      };

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: RealtimeDataMessageType.Subscribe,
            topic: "marketdata/noNumber",
          } as RealtimeDataMessage),
        );
      };

      let messagesReceived = 0;

      const TEST_TICKS = new Map<TickType, MarketDataTick>();
      function emitTestTick(type: TickType, data: MarketDataTick): void {
        TEST_TICKS.set(type, data);
        app.ibApiMock.marketDataUpdate.next({
          all: TEST_TICKS,
          changed: new Map([[type, data]]),
        });
      }

      ws.onmessage = event => {
        const msg = JSON.parse(event.data.toString()) as RealtimeDataMessage;
        switch (messagesReceived) {
          case 0:
            expect(msg.error?.code).toEqual(HttpStatus.BAD_REQUEST);
            expect(msg.error?.desc).toEqual(
              "subscribe marketdata/noNumber: conId is not a number.",
            );

            ws.send(
              JSON.stringify({
                type: RealtimeDataMessageType.Subscribe,
                topic: "marketdata/123456789",
              } as RealtimeDataMessage),
            );
            break;
          case 1:
            expect(msg.error?.code).toEqual(HttpStatus.BAD_REQUEST);
            expect(msg.error?.desc).toEqual(
              "subscribe marketdata/123456789: conId not found.",
            );

            emitTestTick(TickType.ASK, {
              value: Math.random(),
              ingressTm: Math.random(),
            });

            ws.send(
              JSON.stringify({
                type: RealtimeDataMessageType.Subscribe,
                topic: `marketdata/${TEST_CONID1}`,
              } as RealtimeDataMessage),
            );
            break;

          case 2:
            expect(msg.topic).toEqual(`marketdata/${TEST_CONID1}`);
            expect(msg.data?.marketdata?.ASK).toEqual(
              TEST_TICKS.get(TickType.ASK)?.value,
            );

            // must not trigger a change:
            emitTestTick(TickType.ASK, {
              value: TEST_TICKS.get(TickType.ASK)?.value,
              ingressTm: TEST_TICKS.get(TickType.ASK)?.ingressTm ?? 0,
            });

            setTimeout(() => {
              emitTestTick(TickType.BID, {
                value: Math.random(),
                ingressTm: Math.random(),
              });
            }, 50);

            break;

          case 3:
            expect(msg.topic).toEqual(`marketdata/${TEST_CONID1}`);
            expect(msg.data?.marketdata?.BID).toEqual(
              TEST_TICKS.get(TickType.BID)?.value,
            );

            ws.close();
            resolve();
            break;
        }

        messagesReceived++;
      };
    });
  });
});
