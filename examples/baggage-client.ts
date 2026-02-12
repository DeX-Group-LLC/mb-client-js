import { WebSocketClient } from '../src';
import { config } from './config';

const airlines = ['BA', 'UA', 'LH', 'AF', 'DL', 'EK', 'SQ', 'CX', 'AA'];
const airports = ['LHR', 'JFK', 'FRA', 'CDG', 'LAX', 'DXB', 'SFO', 'ORD', 'SIN', 'HKG', 'LAS', 'ATL'];
const firstNames = ['JOHN', 'JANE', 'JIM', 'SUE', 'PETER', 'ANNA', 'MIKE', 'EMILY'];
const lastNames = ['SMITH', 'DOE', 'DOYLE', 'JONES', 'WILLIAMS', 'BROWN', 'DAVIS', 'MILLER'];
const travelClasses = ['Y', 'J', 'F'];
const statuses = ['ON', 'OFF', 'TRANSFER', 'CHECK_IN'];

const randomElement = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const randomDigits = (len: number) => Math.random().toString().slice(2, 2 + len);
const flightDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase().replace(' ', '');

/**
 * Generates a random BSM (Baggage Source Message) payload.
 */
function generateRandomBsmPayload() {
    return {
        // .V/1LLAS
        version: '1',
        routingAirport: randomElement(airports),
        // .F/AA403/03JUN/ATL/Y
        flight: {
            airline: randomElement(airlines),
            number: randomDigits(3),
            date: flightDate,
            destination: randomElement(airports),
            class: randomElement(travelClasses)
        },
        // .N/0001008072001
        tagNumber: '000' + randomDigits(10),
        // .P/JIM/DOYLE
        passenger: {
            firstName: randomElement(firstNames),
            lastName: randomElement(lastNames)
        }
    };
}

/**
 * Converts a BSM JSON payload to its raw IATA string format.
 */
function formatRawBsm(payload: ReturnType<typeof generateRandomBsmPayload>): string {
    return [
        'BSM',
        `.V/${payload.version}${payload.routingAirport}`,
        `.F/${payload.flight.airline}${payload.flight.number}/${payload.flight.date}/${payload.flight.destination}/${payload.flight.class}`,
        `.N/${payload.tagNumber}`,
        `.P/${payload.passenger.firstName}/${payload.passenger.lastName}`,
        '-ENDBSM'
    ].join('\n');
}

/**
 * Generates a random BPM (Baggage Process Message) payload.
 */
function generateRandomBpmPayload() {
    return {
        // .ZRHAF1234/11MAR
        processingAirport: randomElement(airports),
        airline: randomElement(airlines),
        flightNumber: randomDigits(4),
        date: flightDate,
        // 1/1234567890
        bagNumber: 1,
        tagNumber: '000' + randomDigits(10),
        // JFK/EWR
        routing: [randomElement(airports), randomElement(airports)],
        // ON/X456
        status: randomElement(statuses),
        location: 'X' + randomDigits(3)
    };
}

/**
 * Converts a BPM JSON payload to its raw IATA string format.
 */
function formatRawBpm(payload: ReturnType<typeof generateRandomBpmPayload>): string {
    return [
        'BPM',
        `.${payload.processingAirport}${payload.airline}${payload.flightNumber}/${payload.date}`,
        `${payload.bagNumber}/${payload.tagNumber}`,
        `${payload.routing.join('/')}`,
        `${payload.status}/${payload.location}`,
        '-ENDBPM'
    ].join('\n');
}

export function runBaggageClient() {
    console.log('Starting baggage client simulator...');
    const wsProtocol = process.env.WS_PROTOCOL ?? 'ws';
    const wsPort = wsProtocol === 'wss' ? config.ports.wss : config.ports.ws;
    const url = `${wsProtocol}://${config.host}:${wsPort}`;

    const baggageClient = new WebSocketClient({ url });

    let messageCount = 0;
    let intervalId: NodeJS.Timeout | null = null;
    const MESSAGE_INTERVAL = 1000; // 1 message per second

    baggageClient.connected$.on(() => {
        console.log('Baggage Client connected');

        // 1. Register as Baggage Service Client Simulator
        baggageClient.register('Baggage Service Client Simulator', '[WS] Simulates a high volume of BSM and BPM messages');

        // 2. Subscribe to incoming baggage messages to log them if any appear
        baggageClient.subscribe('publish', 'baggage.bsm.in', 1, (message) => {
            console.log(`\n[IN] Received BSM:`, message.payload);
        });
        baggageClient.subscribe('publish', 'baggage.bpm.in', 1, (message) => {
            console.log(`\n[IN] Received BPM:`, message.payload);
        });

        // 3. Start sending simulated messages
        console.log('Starting BSM/BPM simulation. Press Ctrl+C to stop.');
        intervalId = setInterval(() => {
            // Generate and send BSM (from IATA source)
            const bsmPayload = generateRandomBsmPayload();
            const rawBsm = formatRawBsm(bsmPayload);
            baggageClient.publish('baggage.bsm.out', bsmPayload);
            baggageClient.publish('baggage.bsm.raw.out', { raw: rawBsm });

            // Simulate a scanner reading the tag from the BSM
            baggageClient.publish('baggage.scanner.read', { tagNumber: bsmPayload.tagNumber });
            
            // Generate and send BPM (to IATA system)
            const bpmPayload = generateRandomBpmPayload();
            const rawBpm = formatRawBpm(bpmPayload);
            baggageClient.publish('baggage.bpm.out', bpmPayload);
            baggageClient.publish('baggage.bpm.raw.out', { raw: rawBpm });

            messageCount += 2; // BSM and BPM
            process.stdout.write(`Sent ${messageCount} total messages (BSM+BPM)\r`);
        }, MESSAGE_INTERVAL);
    });

    baggageClient.error$.on((error) => {
        console.error('\nBaggage client error:', error);
        if (intervalId) clearInterval(intervalId);
    });

    baggageClient.disconnected$.on(() => {
        console.log('\nBaggage Client disconnected');
        if (intervalId) clearInterval(intervalId);
    });

    baggageClient.connect();
}

if (require.main === module) runBaggageClient();
