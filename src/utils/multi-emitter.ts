import { SingleEmitter } from "./single-emitter";

/**
 * Base class providing event emitter functionality.
 * Allows components to subscribe to and emit events.
 */
export class MultiEmitter<T extends (...args: any[]) => void = (...args: any[]) => void> {
    /** Map storing event emitters for each event type */
    public readonly events = new Map<string, SingleEmitter<T>>();
    /** Event emitter for when a new event is created */
    public readonly createdEmitter$ = new SingleEmitter<(event: string) => void>();
    public readonly removedEmitter$ = new SingleEmitter<(event: string) => void>();

    /**
     * Gets or creates a SingleEmitter for the given event type
     * 
     * @param event - Event to get emitter for
     * @returns SingleEmitter for the event
     */
    getEmitter(event: string): SingleEmitter<T> {
        let emitter = this.events.get(event);
        if (!emitter) {
            emitter = new SingleEmitter<T>();
            this.events.set(event, emitter);
            this.createdEmitter$.emit(event);
        }
        return emitter;
    }

    /**
     * Checks if an event has listeners.
     *
     * @param event - Event to check
     * @returns True if the event has listeners, false otherwise
     */
    has(event: string): boolean {
        return this.events.has(event);
    }

    /**
     * Adds a listener for the specified event.
     *
     * @param event - Event to add listener to
     * @param callback - Function to call when the event occurs
     */
    on(event: string, callback: T): void {
        this.getEmitter(event).on(callback);
    }

    /**
     * Adds a one-time listener.
     * The listener will be removed after it is called once.
     *
     * @param event - Event to add listener to
     * @param callback - Function to call when the event occurs
     */
    once(event: string, callback: T): void {
        this.getEmitter(event).once(callback);
    }

    /**
     * Removes a listener.
     *
     * @param event - Event to remove listener from
     * @param callback - Function to remove from listeners
     */
    off(event: string, callback: T): void {
        const emitter = this.events.get(event);
        if (emitter) {
            emitter.off(callback);
            // Clean up empty emitters
            if (emitter.empty) {
                this.events.delete(event);
                this.removedEmitter$.emit(event);
            }
        }
    }

    /**
     * Emits an event with the specified arguments.
     *
     * @param event - Event to emit
     * @param args - Arguments to pass to event listeners
     */
    emit(event: string, ...args: Parameters<T>): void {
        const emitter = this.events.get(event);
        if (emitter) {
            if (emitter.size) emitter.emit(...args);
            // Check if the emitter is empty after emitting. If so, remove it.
            if (emitter.empty) {
                this.events.delete(event);
                this.removedEmitter$.emit(event);
            }
        }
    }

    /**
     * Removes all listeners.
     *
     * @param event - Optional event to clear listeners for
     */
    clear(event?: string): void {
        if (event) {
            const emitter = this.events.get(event);
            if (emitter) {
                emitter.clear();
                this.events.delete(event);
                this.removedEmitter$.emit(event);
            }
        } else {
            // Emit the removed event for each event
            for (const event of this.events.keys()) {
                this.removedEmitter$.emit(event);
            }
            this.events.clear();
        }
    }
}