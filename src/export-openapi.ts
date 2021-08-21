import path from "path";
import {IBApiApp} from "./app";

new IBApiApp().exportOpenApi(path.resolve(__dirname, ".."));
