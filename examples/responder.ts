import { WebSocketClient } from "../src";
import { config } from "./config";

export function runResponder() {
    console.log("Starting responder...");
    const wsProtocol = process.env.WS_PROTOCOL ?? "ws";
    const wsPort = wsProtocol === "wss" ? config.ports.wss : config.ports.ws;
    const url = `${wsProtocol}://${config.host}:${wsPort}`;

    const responder = new WebSocketClient({ url });

    responder.connected$.on(() => {
        console.log("Responder connected");
        // Register as Test Responder
        responder.request("system.service.register", {
            name: "Test Responder",
            description: "[WS] Responds to test messages and triggers additional events",
        });

        // Subscribe to test.message
        responder.subscribe("request", "test.message", 1, (message) => {
            const { requestId } = message.header;
            if (!requestId) return;

            // Send response to the original request
            message.response(message.payload);

            const payload = {
                timestamp: new Date().toISOString(),
                triggeredBy: "responder",
            };

            // Send additional trigger messages, using the message as parent
            message.publish("test.trigger.publish", payload);
            message.request("test.trigger.request", payload);
        });

        // Subscribe to test.end
        responder.subscribe("request", "test.end");
    });

    responder.error$.on((error) => {
        console.error("Responder error:", error);
    });

    responder.connect();
}

if (require.main === module) runResponder();