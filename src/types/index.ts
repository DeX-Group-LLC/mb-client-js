/** Types of actions that can be sent over the WebSocket */
export enum ActionType {
    /** Publish a message to a topic */
    PUBLISH = 'publish',
    /** Request data from a topic */
    REQUEST = 'request',
    /** Response to a request */
    RESPONSE = 'response'
}

/**
 * Represents the header section of a message.
 * Contains metadata about the message including its action type, topic, and version.
 */
export type BrokerHeader = {
    /** The type of action this message represents (e.g., REQUEST, RESPONSE, PUBLISH) */
    action: ActionType;

    /** The topic this message belongs to, using dot notation (e.g., 'service.event') */
    topic: string;

    /** The version of the message format (e.g., '1.0.0') */
    version: string;

    /** Optional unique identifier for request-response message pairs */
    requestId?: string;
};

/**
 * Represents the header section of a message.
 * Contains metadata about the message including its action type, topic, and version.
 */
export type ClientHeader = BrokerHeader & {
    /** Optional unique identifier for parent request-response message pairs */
    parentRequestId?: string;

    /** Optional timeout for request-response message pairs */
    timeout?: number;
};

/**
 * Represents the header section of a message.
 * Contains metadata about the message including its action type, topic, and version.
 */
export type Header = BrokerHeader | ClientHeader;

/**
 * Represents an error structure within a message.
 * Used to communicate error details in a standardized format.
 */
export type Error = {
    /** Unique error code identifying the type of error */
    code: string;

    /** Human-readable error message describing what went wrong */
    message: string;

    /** Timestamp when the error occurred in ISO 8601 format */
    timestamp: string; // ISO 8601 format (e.g., "2023-10-27T10:30:00Z")

    /** Optional additional error details as a structured object */
    details?: object;
};

/**
 * Represents the payload section of a message.
 * Contains the actual data being transmitted along with optional control fields.
 */
export type PayloadError = Error;
export type PayloadSuccess = Record<string, any>;
export type Payload = PayloadSuccess | PayloadError;

/**
 * Represents a complete message in the system.
 * Combines a header and payload to form a full message structure.
 */
export type Message<T extends BrokerHeader | ClientHeader, U extends Payload = Payload> = {
    /** Message metadata and routing information */
    header: T;

    /** Message content and data */
    payload: U;
};

/** Possible states of the WebSocket connection */
export enum ConnectionState {
    /** Successfully connected to the server */
    CONNECTED = 'connected',
    /** Currently attempting to connect (first time) */
    CONNECTING = 'connecting',
    /** Attempting to reconnect after disconnection */
    RECONNECTING = 'reconnecting',
    /** Not connected to the server */
    DISCONNECTED = 'disconnected'
}

/** Connection event types */
export enum ConnectionEventType {
    /** Connection established successfully */
    CONNECTED = 'connected',
    /** Initial connection attempt */
    CONNECTING = 'connecting',
    /** Attempting to reconnect */
    RECONNECTING = 'reconnecting',
    /** Connection lost */
    DISCONNECTED = 'disconnected',
    /** Error occurred */
    ERROR = 'error'
}

/** Structure of connection events */
export interface ConnectionEvent {
    /** Type of event */
    type: ConnectionEventType;
    /** Timestamp of the event */
    timestamp: Date;
    /** Optional error message */
    error?: string;
    /** Optional attempt number for reconnection events */
    attempt?: number;
}

/** Connection details */
export interface ConnectionDetails {
    /** Current connection state */
    state: ConnectionState;
    /** URL of the WebSocket server */
    url: string;
    /** Time of last successful connection */
    lastConnected?: Date;
    /** Number of reconnection attempts */
    reconnectAttempts: number;
    /** Latest connection latency in ms */
    latency?: number;
    /** Recent connection events */
    recentEvents: ConnectionEvent[];
}

/** Configuration options for the WebSocket client */
export interface WebSocketConfig {
    /** URL of the WebSocket server */
    url: string;
    /** Heartbeat interval in milliseconds */
    heartbeatInterval?: number;
    /** Reconnection delay in milliseconds */
    reconnectDelay?: number;
    /** Maximum number of recent events to keep */
    maxRecentEvents?: number;
    /** Protocol version */
    protocolVersion?: string;
}

/** Pending request structure */
export interface PendingRequest {
    resolve: (response: any) => void;
    reject: (error: any) => void;
    timeout?: NodeJS.Timeout;
}