import { WebSocketClient } from "../src";
import { config } from "./config";

export function runListener() {
    console.log("Starting listener...");
    const wsProtocol = process.env.WS_PROTOCOL ?? "ws";
    const wsPort = wsProtocol === "wss" ? config.ports.wss : config.ports.ws;
    const url = `${wsProtocol}://${config.host}:${wsPort}`;

    const listener = new WebSocketClient({ url });

    listener.connected$.on(() => {
        console.log("Listener connected");
        // Register as Test Listener
        listener.register("Test Listener", "[WS] Listens for trigger messages and sends end signal");

        // Subscribe to both trigger topics
        listener.subscribe("publish", "test.trigger.publish", 1);
        listener.subscribe("request", "test.trigger.request", 1, (message) => {
            // Send response back to the requester
            message.response(message.payload);

            const payload = {
                timestamp: new Date().toISOString(),
                triggeredBy: "listener",
            };

            // Send test.no_route publish message, using the message as parent
            message.publish("test.noroute", payload);

            // Send test.end publish message, using the message as parent
            message.request("test.end", payload, { timeout: 500 });
        });
    });

    listener.error$.on((error) => {
        console.error("Listener error:", error);
    });

    listener.connect();
}

if (require.main === module) runListener();