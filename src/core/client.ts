import { MessageSerializer } from '../serialization/message';
import { ActionType, BrokerHeader, ClientHeader, Message, Payload, PendingRequest } from '../types';
import * as Topic from '../utils/topic';
import { VERSION } from '../version';
import { SingleEmitter } from '../utils/single-emitter';

const DEFAULT_TIMEOUT = 10000;
const DEFAULT_RECONNECT_DELAY = 1000;
const DEFAULT_MAX_RECONNECT_ATTEMPTS = Infinity;

/**
 * Configuration options for the client
 */
export interface ClientConfig {
    /** The URL to connect to */
    url: string;
    /** Optional reconnection settings */
    reconnect?: {
        /** Whether to automatically reconnect on disconnect */
        enabled: boolean;
        /** Maximum number of reconnection attempts */
        maxAttempts?: number;
        /** Delay between reconnection attempts in milliseconds */
        delay?: number;
    };
}

/**
 * Options for requests
 * @param parentRequestId - The parent request ID
 * @param version - The version of the protocol to use
 * @param timeout - The timeout for the request in milliseconds
 */
interface RequestOptions {
    parentRequestId?: string;
    version: string;
    timeout?: number;
}

/**
 * Options for publish requests
 * @extends RequestOptions
 * @param parentRequestId - The parent request ID
 * @param version - The version of the protocol to use
 * @param timeout - The timeout for the request in milliseconds
 * @param withRequestId - Whether to include a request ID
 */
interface PublishOptions extends RequestOptions {
    withRequestId?: boolean;
}

/**
 * Abstract base client class that defines the interface for different client implementations
 */
export abstract class Client {
    protected isConnected: boolean = false;
    protected subscriptions: Map<string, (message: Message<ClientHeader, Payload>) => void> = new Map();
    protected requests: Map<string, PendingRequest> = new Map();
    protected reconnectAttempts: number = 0;
    protected reconnectTimer?: NodeJS.Timeout;

    public readonly connected$ = new SingleEmitter<() => void>();
    public readonly disconnected$ = new SingleEmitter<() => void>();
    public readonly message$ = new SingleEmitter<(message: Message<ClientHeader, Payload>) => void>();
    public readonly error$ = new SingleEmitter<(error: Error) => void>();
    public readonly reconnecting$ = new SingleEmitter<(data: { attempt: number; maxAttempts: number }) => void>();

    /**
     * Creates a new client instance
     * @param config - The client configuration
     */
    constructor(protected config: ClientConfig) {
        // Initialize reconnect config with defaults
        this.config.reconnect = {
            enabled: this.config.reconnect?.enabled ?? false,
            delay: this.config.reconnect?.delay ?? DEFAULT_RECONNECT_DELAY,
            maxAttempts: this.config.reconnect?.maxAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS
        };
    }

    /**
     * Handles a disconnection event and initiates reconnection if enabled
     * @protected
     */
    protected handleDisconnect(): void {
        // Clear any existing reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }

        // Update state and emit event
        this.isConnected = false;
        this.disconnected$.emit();

        // Attempt reconnection if enabled
        if (this.config.reconnect?.enabled) {
            this.attemptReconnect();
        }
    }

    /**
     * Attempts to reconnect to the server
     * @private
     */
    private attemptReconnect(): void {
        const { delay = DEFAULT_RECONNECT_DELAY, maxAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS } = this.config.reconnect!;

        // Check if we've exceeded max attempts
        if (this.reconnectAttempts >= maxAttempts) {
            this.error$.emit(new Error(`Maximum reconnection attempts (${maxAttempts}) exceeded`));
            return;
        }

        // Increment attempts and emit reconnecting event
        this.reconnectAttempts++;
        this.reconnecting$.emit({ attempt: this.reconnectAttempts, maxAttempts });

        // Schedule reconnection attempt
        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.connect();

                // Reset attempts on successful connection
                this.reconnectAttempts = 0;
            } catch (error) {
                // Emit error and try again
                this.error$.emit(error instanceof Error ? error : new Error('Reconnection failed'));
                this.attemptReconnect();
            }
        }, delay);
    }

    /**
     * Resets the reconnection state
     * @protected
     */
    protected handleConnect(): void {
        // Clear any existing reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }

        // Reset reconnect attempts and update state
        this.reconnectAttempts = 0;
        this.isConnected = true;
        this.connected$.emit();
    }

    /**
     * Connects the client to the server
     * Closes and reconnects if already connected
     */
    abstract connect(): Promise<void>;

    /**
     * Disconnects the client from the server
     */
    abstract disconnect(): Promise<void>;

    protected handleMessage(message: string) {
        try {
            const deserializedMessage = MessageSerializer.deserialize(message);

            // Lookup requests
            if (deserializedMessage.header.requestId) {
                const request = this.requests.get(deserializedMessage.header.requestId);
                if (request) {
                    if ((deserializedMessage.payload as any).error) {
                        request.reject(new Error((deserializedMessage.payload as any).error));
                    } else {
                        request.resolve(deserializedMessage);
                    }
                }
            }

            // Emit the message
            this.message$.emit(deserializedMessage);
        } catch (error) {
            this.error$.emit(error instanceof Error ? error : new Error('Failed to deserialize message'));
        }
    }

    /**
     * Sends a data string to the server
     * @param data - The data to send
     */
    protected abstract send(data: string): void;

    /**
     * Publishes a message to the server
     * @param topic - The topic to publish to
     * @param payload - The payload to publish
     * @param version - The version of the protocol to use (defaults to the current version)
     */
    async publish(topic: string, payload: Record<string, any>, options?: PublishOptions) {
        // Validate the topic
        if (!Topic.isValid(topic)) throw new Error(`Invalid topic name: ${topic}`);

        const requestId = options?.withRequestId ? crypto.randomUUID() : undefined;

        // Serialize the message
        const header = { action: ActionType.PUBLISH, topic, version: options?.version ?? VERSION, requestId, parentRequestId: options?.parentRequestId };
        const message = MessageSerializer.serialize(header, payload);

        return new Promise((resolve, reject) => {
            if (requestId) {
                // Add the request to the map
                this.requests.set(requestId, {
                    resolve: (message: Message<BrokerHeader, Payload>) => {
                        this.requests.delete(requestId);
                        resolve(message);
                    },
                    reject: (error: Error) => {
                        this.requests.delete(requestId);
                        reject(error);
                    },
                    timeout: setTimeout(() => {
                        this.requests.delete(requestId);
                        reject(new Error('Request timed out'));
                    }, options?.timeout ?? DEFAULT_TIMEOUT)
                });
            } else {
                // Resolve immediately
                setTimeout(resolve);
            }

            // Send the message
            this.send(message);
        });
    }

    /**
     * Sends a request to the server and waits for a response
     * @param topic - The topic to send the request to
     * @param payload - The payload to send
     * @param version - The version of the protocol to use (defaults to the current version)
     * @param timeout - The timeout for the request in milliseconds (defaults to no timeout)
     * @returns The response message
     */
    async request(topic: string, payload: Record<string, any>, options?: RequestOptions): Promise<Message<BrokerHeader, Payload>> {
        // Validate the topic
        if (!Topic.isValid(topic)) throw new Error(`Invalid topic name: ${topic}`);

        // Generate a unique request ID
        const requestId = crypto.randomUUID();

        // Serialize the message
        const header = { action: ActionType.PUBLISH, topic, version: options?.version ?? VERSION, requestId, parentRequestId: options?.parentRequestId };
        const message = MessageSerializer.serialize(header, payload);

        // Add the request to the map
        return new Promise((resolve, reject) => {
            this.requests.set(requestId, {
                resolve: (message: Message<BrokerHeader, Payload>) => {
                    this.requests.delete(requestId);
                    resolve(message);
                },
                reject: (error: Error) => {
                    this.requests.delete(requestId);
                    reject(error);
                },
                timeout: setTimeout(() => {
                    this.requests.delete(requestId);
                    reject(new Error('Request timed out'));
                }, options?.timeout ?? DEFAULT_TIMEOUT)
            });

            // Send the message
            this.send(message);
        });
    }

    /**
     * Registers a new topic
     * @param name - The name of the topic
     * @param description - The description of the topic
     */
    async register(name: string, description: string, options?: RequestOptions): Promise<Message<BrokerHeader, Payload>> {
        return this.request('system.service.register', { name, description }, options);
    }

    /**
     * Subscribes to a topic
     * @param topic - The topic to subscribe to
     * @param priority - The priority of the subscription (defaults to 0)
     * @param options - The options for the subscription
     * @returns The response message
     */
    async subscribe(topic: string, priority: number = 0, options?: RequestOptions): Promise<Message<BrokerHeader, Payload>> {
        return this.request('system.topic.subscribe', { topic, priority }, options);
    }

    /**
     * Unsubscribes from a topic
     * @param topic - The topic to unsubscribe from
     */
    async unsubscribe(topic: string, options?: RequestOptions): Promise<Message<BrokerHeader, Payload>> {
        return this.request('system.topic.unsubscribe', { topic }, options);
    }
}
