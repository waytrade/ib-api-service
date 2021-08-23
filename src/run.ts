import {exit} from "process";
import {IBApiApp} from "./app";

new IBApiApp().start().catch(() => {
  console.error("Failed to start ib-api-service App");
  exit(1);
});
