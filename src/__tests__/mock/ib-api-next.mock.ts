import {ConnectionState, IBApiNextCreationOptions} from "@stoqey/ib";
import {BehaviorSubject, Observable} from "rxjs";

export class IBApiNextMock {
  constructor(options?: IBApiNextCreationOptions) {}

  private _connectionState = new BehaviorSubject<ConnectionState>(
    ConnectionState.Disconnected,
  );

  get connectionState(): Observable<ConnectionState> {
    return this._connectionState;
  }

  connect(clientId?: number): IBApiNextMock {
    this._connectionState.next(ConnectionState.Connecting);
    this._connectionState.next(ConnectionState.Connected);
    return this;
  }
  disconnect(): IBApiNextMock {
    this._connectionState.next(ConnectionState.Disconnected);
    return this;
  }
}
