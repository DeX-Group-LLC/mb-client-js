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
export { SingleEmitter } from './utils/single-emitter';
export { MultiEmitter } from './utils/multi-emitter';
export { MessageSerializer } from './serialization/message';