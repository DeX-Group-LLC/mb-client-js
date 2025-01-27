// Core exports
export { WebSocketClient } from './core/websocket-client';

// Type exports
export {
    ActionType,
    ConnectionState,
    ConnectionEventType,
    ConnectionEvent,
    ConnectionDetails,
    Message,
    WebSocketConfig
} from './types';

// Utility exports
export { EventEmitter } from './utils/event-emitter';
export { MessageSerializer } from './serialization/message';