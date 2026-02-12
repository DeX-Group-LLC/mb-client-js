import { WebSocketClient } from '../src';
import { config } from './config';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

/**
 * Parses the iata.md file to extract baggage identifiers.
 * This is a simplified parser assuming identifiers are in markdown lists.
 * @param filePath Path to the iata.md file.
 * @returns A promise that resolves to an array of identifiers.
 */
async function parseIataFile(filePath: string): Promise<string[]> {
    const identifiers: string[] = [];
    try {
        const fileStream = createReadStream(filePath);
        const rl = createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        // A simple regex to find lines that look like list items with some content.
        const listItemRegex = /^\s*[-*]\s+(.+)/;

        for await (const line of rl) {
            const match = line.match(listItemRegex);
            if (match && match[1]) {
                identifiers.push(match[1].trim());
            }
        }
    } catch (error) {
        console.error(`Error reading or parsing file at ${filePath}:`, error);
    }
    return identifiers;
}

export async function runIataClient() {
    console.log('Starting IATA client...');

    // Note: The path is relative to the mb-client-js directory
    const iataData = await parseIataFile('../mb-server-node/examples/iata.md');

    if (iataData.length === 0) {
        console.error('Could not parse any IATA data from ../mb-server-node/examples/iata.md.');
        console.error('Please ensure the file exists and contains data in a markdown list format (e.g., "- item").');
        return;
    }

    const wsProtocol = process.env.WS_PROTOCOL ?? 'ws';
    const wsPort = wsProtocol === 'wss' ? config.ports.wss : config.ports.ws;
    const url = `${wsProtocol}://${config.host}:${wsPort}`;

    const iataClient = new WebSocketClient({ url });

    iataClient.connected$.on(async () => {
        console.log('IATA Client connected');
        // Register as IATA Client Service
        iataClient.register('IATA Client Service', '[WS] Sends sort requests based on iata.md');

        // Send a sort request with the parsed IATA data
        try {
            console.log(`Sending sort request with ${iataData.length} items...`);
            const response = await iataClient.request('common.sort.request', { barcodes: iataData }, { timeout: 5000 });
            console.log(`IATA client received response: ${response.header.topic}`, response.payload);
        } catch (e) {
            console.error(`IATA client caught error:`, e);
        } finally {
            iataClient.disconnect();
        }
    });

    iataClient.error$.on((error) => {
        console.error('IATA client error:', error);
    });
    
    iataClient.disconnected$.on(() => {
        console.log('IATA Client disconnected');
    });

    iataClient.connect();
}

if (require.main === module) runIataClient();
