import { WebSocketClient } from "../src";
import { config } from "./config";

/**
 * @interface BagScanPayload
 * Defines the structure for a bag scan event payload.
 */
interface BagScanPayload {
    tagNumber: string;
}

/**
 * Runs the Sortation Allocation Controller (SAC) client simulator.
 * This client subscribes to bag scan events, makes a random sorting decision,
 * and publishes that decision.
 */
export function runSacClient() {
    console.log("Starting SAC client...");
    const wsProtocol = process.env.WS_PROTOCOL ?? "ws";
    const wsPort = wsProtocol === "wss" ? config.ports.wss : config.ports.ws;
    const url = `${wsProtocol}://${config.host}:${wsPort}`;

    const sacClient = new WebSocketClient({ url });

    sacClient.connected$.on(() => {
        console.log("SAC Client connected");
        // Register as Sortation Allocation Controller Service
        sacClient.register("SAC Service", "[WS] Simulates sortation allocation decisions based on bag scans.");

        // Subscribe to bag scanner reads
        sacClient.subscribe<BagScanPayload>("publish", "baggage.scanner.read", 1, (message) => {
            const { tagNumber } = message.payload;
            if (!tagNumber) {
                return;
            }
            
            // Simple logic to generate a random chute/destination
            const destination = `C${Math.floor(Math.random() * 20) + 1}`;
            console.log(`[SAC] Received scan for tag ${tagNumber}. Assigning destination: ${destination}`);

            // Publish the sortation decision
            message.publish("sac.decision", {
                tagNumber,
                destination,
            });
        });
    });

    sacClient.error$.on((error) => {
        console.error("SAC client error:", error);
    });

    sacClient.disconnected$.on(() => {
        console.log("\nSAC Client disconnected");
    });

    sacClient.connect();
}

if (require.main === module) {
    runSacClient();
}

