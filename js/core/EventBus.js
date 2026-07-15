export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    this.listeners.get(eventName).push(handler);

    return () => {
      this.off(eventName, handler);
    };
  }

  off(eventName, handler) {
    const eventListeners = this.listeners.get(eventName);

    if (!eventListeners) {
      return;
    }

    this.listeners.set(
      eventName,
      eventListeners.filter((listener) => listener !== handler)
    );
  }

  emit(eventName, payload) {
    const eventListeners = this.listeners.get(eventName) ?? [];

    for (const listener of eventListeners) {
      listener(payload);
    }
  }
}
