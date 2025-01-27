/**
 * Creates a debounced version of a function that delays invoking func until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay. If < 0, executes immediately, = 0, executes after the next tick, > 0, executes after wait milliseconds
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
    let timeoutId: number | undefined;
    let lastArgs: Parameters<T>;
    let lastTime: number = -Number.MAX_SAFE_INTEGER;

    const debounced = function(this: any, ...args: Parameters<T>) {
        // Cache the latest arguments
        lastArgs = args;

        // Calculate actual delay based on lastTime
        const actualDelay = wait - (Date.now() - lastTime);

        // Clear any existing timeout
        if (timeoutId !== undefined) {
            window.clearTimeout(timeoutId);
        }

        // If delay is < 0, execute immediately
        if (actualDelay < 0) {
            lastTime = Date.now();
            return func.apply(this, args);
        }

        // Schedule new timeout
        timeoutId = window.setTimeout(() => {
            timeoutId = undefined;
            lastTime = Date.now();
            func.apply(this, lastArgs);
        }, Math.max(0, actualDelay));
    };

    // If wait is <= 0, return the original function
    return (wait < 0 ? func : debounced) as T;
}