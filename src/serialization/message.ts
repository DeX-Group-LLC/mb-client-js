import semver from 'semver';
import packageJson from '../../package.json';
import { ActionType, BrokerHeader, ClientHeader, Header, Message, Payload } from '../types';
import * as Topic from '../utils/topic';
import { isUUID4 } from '../utils/uuid4';

const VERSION = packageJson.version;
// Only allow versions that match the major version of the current version:
const VERSION_RANGE = `^${VERSION.split('.')[0]}`;

/**
 * Utilities for serializing and deserializing WebSocket messages.
 */
export class MessageSerializer {
    /**
     * Serializes a message for sending over WebSocket.
     *
     * @param action - Type of action
     * @param topic - Topic name
     * @param payload - Message payload
     * @param version - Protocol version (defaults to 1.0.0)
     * @param requestId - Optional request ID
     * @returns Serialized message string
     */
    static serialize(header: ClientHeader, payload: Payload): string {
        // Build the header
        let headerString = `${header.action}:${header.topic}:${header.version}`;

        // Add optionals
        if (header.timeout) headerString += `:${header.requestId ?? ''}:${header.parentRequestId ?? ''}:${header.timeout}`;
        else if (header.parentRequestId) headerString += `:${header.requestId ?? ''}:${header.parentRequestId}`;
        else if (header.requestId) headerString += `:${header.requestId}`;

        // Serialize the payload
        const payloadString = JSON.stringify(payload);

        // Combine header and payload
        return `${headerString}\n${payloadString}`;
    }

    /**
     * Deserializes a message received over WebSocket.
     *
     * @param data - Raw message data
     * @returns Parsed message object
     * @throws Error if message format is invalid
     */
    static deserialize<T extends Payload>(data: string): Message<BrokerHeader, T> {
        // Split header and payload
        const [header, payload] = data.split('\n');
        if (!header || !payload) {
            throw new Error('Invalid message format: missing header or payload');
        }

        // Parse header components
        const [action, topic, version, requestId] = header.split(':');

        // Validate action type
        if (!action || !Object.values(ActionType).includes(action as ActionType)) {
            throw new Error(`Invalid action type: ${action}`);
        }

        // Validate topic
        if (!topic || !Topic.isValid(topic)) {
            throw new Error(`Invalid topic: ${topic}`);
        }

        // Validate version using semver
        if (!version || !semver.valid(version) || !semver.satisfies(version, VERSION_RANGE)) {
            throw new Error(`Unsupported protocol version: ${version}`);
        }

        // Validate requestId
        if (requestId && !isUUID4(requestId)) {
            throw new Error(`Invalid requestId: ${requestId}`);
        }

        try {
            // Parse payload
            const parsedPayload = JSON.parse(payload);

            // Construct message object
            return {
                header: {
                    action: action as ActionType,
                    topic,
                    version,
                    requestId
                },
                payload: parsedPayload
            };
        } catch (error) {
            throw new Error(`Failed to parse payload: ${error instanceof Error ? error.message : String(error)}`);
        }
    }



    /**
     * Gets the size of a message in bytes.
     * @param header - The header of the message
     * @param payload - The payload of the message
     * @returns The size of the message in bytes
     */
    static getMessageSize(header: Header, payload: Payload): number {
        return new TextEncoder().encode(MessageSerializer.serialize(header, payload)).length;
    }
}