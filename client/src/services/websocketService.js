import { io } from 'socket.io-client';

const BASE_URL = process.env.REACT_APP_BASE_URL;

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    try {
      this.socket = io(BASE_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        // eslint-disable-next-line no-console
        console.info('WebSocket connected:', this.socket.id);
        this.isConnected = true;
        this.emit('connection', { connected: true });
      });

      this.socket.on('disconnect', (reason) => {
        // eslint-disable-next-line no-console
        console.info('WebSocket disconnected:', reason);
        this.isConnected = false;
        this.emit('connection', { connected: false });
      });

      this.socket.on('connect_error', (error) => {
        // eslint-disable-next-line no-console
        console.error('WebSocket connection error:', error);
        this.isConnected = false;
        this.emit('connection', { connected: false, error });
      });

      this.socket.on('reconnect', (attemptNumber) => {
        // eslint-disable-next-line no-console
        console.info('WebSocket reconnected after', attemptNumber, 'attempts');
        this.isConnected = true;
        this.emit('connection', { connected: true });
      });

      this.socket.on('reconnect_error', (error) => {
        // eslint-disable-next-line no-console
        console.error('WebSocket reconnection error:', error);
        this.isConnected = false;
        this.emit('connection', { connected: false, error });
      });

      // Auction events
      this.socket.on('auction-created', (data) => {
        this.emit('auction-created', data);
      });

      this.socket.on('auction-ended', (data) => {
        this.emit('auction-ended', data);
      });

      this.socket.on('auction-extended', (data) => {
        this.emit('auction-extended', data);
      });

      this.socket.on('bid-placed', (data) => {
        this.emit('bid-placed', data);
      });

      this.socket.on('auction-BIN', (data) => {
        this.emit('auction-BIN', data);
      });

      this.socket.on('user-outbid', (data) => {
        this.emit('user-outbid', data);
      });

      this.socket.on('user-won', (data) => {
        this.emit('user-won', data);
      });

      this.socket.on('tracking-info', (data) => {
        this.emit('tracking-info', data);
      });

      this.socket.on('auction-paid', (data) => {
        this.emit('auction-paid', data);
      });

      // Gallery sale events (future use)
      this.socket.on('sale-paid', (data) => {
        this.emit('sale-paid', data);
      });

      this.socket.on('sale-tracking-info', (data) => {
        this.emit('sale-tracking-info', data);
      });

      this.socket.on('sale-created', (data) => {
        this.emit('sale-created', data);
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error initializing WebSocket:', error);
      this.emit('connection', { connected: false, error });
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  joinConversation(conversationId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  leaveConversation(conversationId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  sendMessage(messageData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('send_message', messageData);
    } else {
      // eslint-disable-next-line no-console
      console.warn('Socket not connected, cannot send message');
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id || null,
    };
  }
}

export const websocketService = new WebSocketService();
export default websocketService;
