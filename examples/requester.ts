import { WebSocketClient } from "../src";
import { config } from "./config";

export function runRequester() {
    console.log("Starting requester...");
    const wsProtocol = process.env.WS_PROTOCOL ?? "ws";
    const wsPort = wsProtocol === "wss" ? config.ports.wss : config.ports.ws;
    const url = `${wsProtocol}://${config.host}:${wsPort}`;

    const requester = new WebSocketClient({ url });

    requester.connected$.on(() => {
        console.log("Requester connected");
        // Register as Test Requester
        requester.register("Test Requester", "[WS] Sends test requests periodically");

        // Subscribe to test.end
        requester.subscribe("request", "test.end", 1, (message) => {
            console.log(`Requester received message: ${message.header.topic}`);
            message.response(message.payload);
        });

        // Send test messages every 2 seconds
        setInterval(async () => {
            try {
                const payload = {
                    timestamp: new Date().toISOString(),
                    message: "Hello from requester!",
                };
                const response = await requester.request("test.message", payload, { timeout: 2000 });
                console.log(`Requester received response: ${response.header.topic}`);
            } catch (e) {
                console.error(`Requester caught error:`, e);
            }
        }, 2000);
    });

    requester.error$.on((error) => {
        console.error("Requester error:", error);
    });

    requester.connect();
}

if (require.main === module) runRequester();