// Runs the on-device model off the main thread (see js/ai.js).
import { WebWorkerMLCEngineHandler } from "../vendor/webllm/index.js";

const handler = new WebWorkerMLCEngineHandler();
self.onmessage = message => handler.onmessage(message);
