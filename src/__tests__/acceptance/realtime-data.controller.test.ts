import {HttpStatus} from "@waytrade/microservice-core";
import axios from "axios";
import WebSocket from "ws";
import {
  RealtimeDataMessage,
  RealtimeDataMessageType,
} from "../../models/realtime-data-message.model";
import {IBApiApp} from "../ib-api-test-app";

describe("Test Real-time Data Controller", () => {
  const TEST_USERNAME = "User" + Math.random();
  const TEST_PASSWORD = "Password" + Math.random();

  const app = new IBApiApp();

  let authToken = "";
  let streamEndpointUrl = "";
  let authenticatedStreamEndpointUrl = "";

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
  });

  afterAll(() => {
    app.stop();
  });

  test("Connect to /stream", () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(authenticatedStreamEndpointUrl);
      ws.onerror = err => {
        reject(err.message);
      };
      ws.onopen = () => {
        resolve();
      };
    });
  });

  test("Connect to /stream (no auth argument)", () => {
    return new Promise<void>((resolve, reject) => {
      let errorMessageReceived = false;
      const ws = new WebSocket(streamEndpointUrl);
      ws.onerror = err => {
        reject(err.message);
      };

      ws.onmessage = event => {
        const msg = JSON.parse(event.data.toString()) as RealtimeDataMessage;
        expect(msg.error?.code).toEqual(HttpStatus.UNAUTHORIZED);
        expect(msg.error?.desc).toEqual(
          "Authorization header or auth argument missing",
        );
        errorMessageReceived = true;
      };

      ws.close = () => {
        expect(errorMessageReceived).toBeTruthy();
        resolve();
      };
    });
  });

  test("Connect to /stream (not authorization)", () => {
    return new Promise<void>((resolve, reject) => {
      let errorMessageReceived = false;
      const ws = new WebSocket(
        streamEndpointUrl + `?auth=thisIsNoValieBearerToken`,
      );
      ws.onerror = err => {
        reject(err.message);
      };

      ws.onmessage = event => {
        const msg = JSON.parse(event.data.toString()) as RealtimeDataMessage;
        expect(msg.error?.code).toEqual(HttpStatus.UNAUTHORIZED);
        expect(msg.error?.desc).toEqual("Not authorized");
        errorMessageReceived = true;
      };

      ws.close = () => {
        expect(errorMessageReceived).toBeTruthy();

        resolve();
      };
    });
  });

  test("Subscribe to invalid topic", () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(authenticatedStreamEndpointUrl);
      ws.onerror = err => {
        reject(err.message);
      };
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: RealtimeDataMessageType.Subscribe,
            topic: "invalidTopic",
          } as RealtimeDataMessage),
        );
      };
      ws.onmessage = event => {
        const msg = JSON.parse(event.data.toString()) as RealtimeDataMessage;
        expect(msg.topic).toEqual("invalidTopic");
        expect(msg.error?.code).toEqual(HttpStatus.BAD_REQUEST);
        expect(msg.error?.desc).toEqual("invalid topic");

        resolve();
      };
    });
  });

  test("Send invalid request (no JSON)", () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(authenticatedStreamEndpointUrl);
      ws.onerror = err => {
        reject(err.message);
      };
      ws.onopen = () => {
        ws.send("thisIsNoJSON");
      };
      ws.onmessage = event => {
        const msg = JSON.parse(event.data.toString()) as RealtimeDataMessage;
        expect(msg.error?.code).toEqual(HttpStatus.BAD_REQUEST);
        expect(msg.error?.desc).toEqual(
          "Unexpected token h in JSON at position 1",
        );

        resolve();
      };
    });
  });

  test("Send invalid request (invalid message type)", () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(authenticatedStreamEndpointUrl);
      ws.onerror = err => {
        reject(err.message);
      };
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: "invalidType" as RealtimeDataMessageType,
            topic: "invalidTopic",
          } as RealtimeDataMessage),
        );
      };
      ws.onmessage = event => {
        const msg = JSON.parse(event.data.toString()) as RealtimeDataMessage;
        expect(msg.error?.code).toEqual(HttpStatus.BAD_REQUEST);
        expect(msg.error?.desc).toEqual("Invalid message type: invalidType");

        resolve();
      };
    });
  });
});
