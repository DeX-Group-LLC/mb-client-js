import { WebSocketClient } from "../src";
import { config } from "./config";

interface SortRequestPayload {
    iata: string[];
    barcodes: string[];
}

export function runSortClient() {
    console.log("Starting sort client...");
    const wsProtocol = process.env.WS_PROTOCOL ?? "ws";
    const wsPort = wsProtocol === "wss" ? config.ports.wss : config.ports.ws;
    const url = `${wsProtocol}://${config.host}:${wsPort}`;

    const sortClient = new WebSocketClient({ url });

    sortClient.connected$.on(() => {
        console.log("Sort Client connected");
        // Register as Sort Responder Service
        sortClient.register("Sort Responder Service", "[WS] Responds to common.sort.request messages");

        // Subscribe to common.sort.request
        sortClient.subscribe<SortRequestPayload>("request", "common.sort.request", 1, (message) => {
            let itemCount = message.payload.iata?.length ?? message.payload.barcodes?.length;
            // Check for valid payload
            if (itemCount === undefined) {
                console.error("Sort Client: Received sort request with unknown payload format:", message.payload);
                return;
            }

            // Send mock destinations
            message.response({ destinations: Array.from({ length: itemCount }, (_, i) => (i + 1).toString()) });
        }).catch(error => {
            console.error("Sort Client: Error subscribing to common.sort.request:", error);
        });
    });

    sortClient.error$.on((error) => {
        console.error("Sort client error:", error);
    });

    sortClient.connect();
}

if (require.main === module) runSortClient();