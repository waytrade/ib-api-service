import path from "path";
import {exit} from "process";
import {IBApiApp} from "./app";

new IBApiApp()
  .exportOpenApi(path.resolve(__dirname, ".."))
  .then(() => {
    console.info("Successfully exported openapi.json");
    exit();
  })
  .catch(() => {
    console.error("Failed to export openapi.json");
    exit(1);
  });
