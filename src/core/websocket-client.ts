import { Client, ClientConfig } from './client';

/**
 * Configuration options specific to WebSocket client
 */
export interface WebSocketClientConfig extends ClientConfig {}

/**
 * WebSocket implementation of the base Client
 */
export class WebSocketClient extends Client {
    private ws: WebSocket | null = null;

    /**
     * Creates a new WebSocket client instance
     * @param config - The WebSocket client configuration
     */
    constructor(config: WebSocketClientConfig) {
        super(config);
    }

    /**
     * Establishes WebSocket connection to the server
     */
    async connect(): Promise<void> {
        if (this.isConnected) return;

        return new Promise((resolve, reject) => {
            try {
                const config = this.config as WebSocketClientConfig;
                this.ws = new WebSocket(config.url);

                this.ws.onopen = () => {
                    this.handleConnect();
                    resolve();
                };

                this.ws.onclose = () => {
                    this.handleDisconnect();
                };

                this.ws.onerror = (error: Event) => {
                    this.error$.emit(new Error('WebSocket error occurred'));
                };

                this.ws.onmessage = (event: MessageEvent) => {
                    this.handleMessage(event.data.toString());
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Disconnects from the WebSocket server
     */
    async disconnect(): Promise<void> {
        if (!this.isConnected || !this.ws) return;

        return new Promise((resolve) => {
            this.ws!.onclose = () => {
                this.handleDisconnect();
                resolve();
            };

            this.ws!.close();
        });
    }

    /**
     * Sends a message through the WebSocket connection
     * @param data - The data to send
     */
    protected send(data: string): void {
        if (!this.isConnected || !this.ws) throw new Error('Client is not connected');

        this.ws.send(data);
    }
}