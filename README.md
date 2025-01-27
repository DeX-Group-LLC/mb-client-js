# Message Broker WebSocket Client (mb-client-js)

A TypeScript library for reliable WebSocket communication with the Message Broker server. Features automatic reconnection, heartbeat monitoring, request/response handling, and event-based communication.

## Features

- 🔄 Automatic reconnection with configurable delay
- 💓 Heartbeat monitoring for connection health
- 🤝 Promise-based request/response pattern
- 📡 Event-based message handling
- 📊 Connection state monitoring and events
- ⚡ Efficient message serialization
- 📝 TypeScript support with full type definitions

## Installation

```bash
npm install mb-client
```

## Quick Start

```typescript
import { WebSocketClient } from 'mb-client';

// Create a client instance
const client = new WebSocketClient({
    url: 'ws://localhost:3000'
});

// Connect to the server
client.connect();

// Listen for connection events
client.on('connected', () => {
    console.log('Connected to server!');
});

// Make a request
try {
    const response = await client.request('my.topic', { some: 'data' });
    console.log('Response:', response);
} catch (error) {
    console.error('Request failed:', error);
}

// Publish a message
await client.publish('my.topic', { hello: 'world' });
```

## API Reference

### `WebSocketClient`

The main client class for WebSocket communication.

#### Constructor

```typescript
new WebSocketClient(config: Partial<WebSocketConfig> & Pick<WebSocketConfig, 'url'>)
```

Configuration options:
- `url` (required): WebSocket server URL
- `heartbeatInterval` (optional): Interval between heartbeats in ms (default: 10000)
- `reconnectDelay` (optional): Delay before reconnection attempts in ms (default: 5000)
- `maxRecentEvents` (optional): Maximum number of recent events to keep (default: 50)
- `protocolVersion` (optional): Protocol version string (default: '1.0.0')

#### Methods

- `connect(url?: string): void` - Connect to the server
- `disconnect(): void` - Disconnect from the server
- `request(topic: string, payload?: any, timeout?: number): Promise<any>` - Make a request
- `publish(topic: string, payload?: any): Promise<void>` - Publish a message

#### Events

- `'connected'` - Connection established
- `'disconnected'` - Connection lost
- `'error'` - Connection error
- `'stateChange'` - Connection state changed
- `'connectionEvent'` - Connection event occurred
- `'latencyUpdate'` - Connection latency updated

### Message Format

Messages are serialized in the following format:
```
action:topic:version[:requestId]
{"key": "value"}
```

Where:
- First line: Header with action, topic, version, and optional requestId
- Second line: JSON payload

### Connection States

- `CONNECTED` - Successfully connected to the server
- `CONNECTING` - Initial connection attempt
- `RECONNECTING` - Attempting to reconnect
- `DISCONNECTED` - Not connected to the server

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.