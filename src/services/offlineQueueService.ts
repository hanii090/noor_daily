import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * OfflineQueueService
 * 
 * Manages offline operations queue for Supabase sync.
 * When the app is offline, operations are queued locally
 * and synced when connection is restored.
 */

const QUEUE_KEY = '@noor_offline_queue';

export interface QueuedOperation {
    id: string;
    type: 'history_save' | 'exam_save' | 'preferences_save';
    data: any;
    timestamp: number;
    retryCount: number;
}

class OfflineQueueService {
    private queue: QueuedOperation[] = [];
    private isSyncing = false;
    private isOnline = true;

    constructor() {
        this.initialize();
    }

    /**
     * Initialize queue and network listener
     */
    private async initialize() {
        try {
            // Load persisted queue
            const stored = await AsyncStorage.getItem(QUEUE_KEY);
            if (stored) {
                this.queue = JSON.parse(stored);
                __DEV__ && console.log('[OfflineQueue] Loaded queue with', this.queue.length, 'items');
            }

            // Listen for network changes
            NetInfo.addEventListener(state => {
                const wasOffline = !this.isOnline;
                this.isOnline = state.isConnected ?? false;

                __DEV__ && console.log('[OfflineQueue] Network status:', this.isOnline ? 'ONLINE' : 'OFFLINE');

                // If we just came back online, process queue
                if (wasOffline && this.isOnline) {
                    __DEV__ && console.log('[OfflineQueue] Back online! Processing queue...');
                    this.processQueue();
                }
            });

            // Check initial network status
            const netState = await NetInfo.fetch();
            this.isOnline = netState.isConnected ?? false;

            // If online, process any pending items
            if (this.isOnline && this.queue.length > 0) {
                this.processQueue();
            }
        } catch (error) {
            console.error('[OfflineQueue] Initialization error:', error);
        }
    }

    /**
     * Add operation to queue
     */
    async enqueue(operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
        try {
            const queuedOp: QueuedOperation = {
                ...operation,
                id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
                timestamp: Date.now(),
                retryCount: 0,
            };

            this.queue.push(queuedOp);
            await this.persistQueue();

            __DEV__ && console.log('[OfflineQueue] Enqueued:', operation.type, '- Queue size:', this.queue.length);

            // Try to process immediately if online
            if (this.isOnline) {
                this.processQueue();
            }
        } catch (error) {
            console.error('[OfflineQueue] Enqueue error:', error);
        }
    }

    /**
     * Process queue and sync to Supabase
     */
    async processQueue(): Promise<void> {
        if (this.isSyncing || !this.isOnline || this.queue.length === 0) {
            return;
        }

        this.isSyncing = true;
        __DEV__ && console.log('[OfflineQueue] Processing queue with', this.queue.length, 'items');

        const failedOps: QueuedOperation[] = [];

        for (const op of this.queue) {
            try {
                // Import services dynamically to avoid circular dependencies
                const success = await this.executeOperation(op);

                if (!success) {
                    op.retryCount++;

                    // Keep in queue if retry count < 5
                    if (op.retryCount < 5) {
                        failedOps.push(op);
                    } else {
                        __DEV__ && console.warn('[OfflineQueue] Operation failed after 5 retries, dropping:', op.type);
                    }
                }
            } catch (error) {
                console.error('[OfflineQueue] Operation failed:', op.type, error);
                op.retryCount++;

                if (op.retryCount < 5) {
                    failedOps.push(op);
                }
            }
        }

        this.queue = failedOps;
        await this.persistQueue();

        this.isSyncing = false;
        __DEV__ && console.log('[OfflineQueue] Processing complete. Remaining:', this.queue.length);
    }

    /**
     * Execute a queued operation
     */
    private async executeOperation(op: QueuedOperation): Promise<boolean> {
        try {
            const { supabase } = await import('../config/supabase');

            switch (op.type) {
                case 'history_save':
                    const { error: historyError } = await supabase
                        .from('history_entries')
                        .insert(op.data);

                    if (historyError) {
                        // Ignore duplicate errors (already saved)
                        if (historyError.code === '23505') {
                            __DEV__ && console.log('[OfflineQueue] History entry already exists, skipping');
                            return true;
                        }
                        console.error('[OfflineQueue] History save failed:', historyError);
                        return false;
                    }

                    __DEV__ && console.log('[OfflineQueue] History saved successfully');
                    return true;

                case 'exam_save':
                    const { error: examError } = await supabase
                        .from('exam_sessions')
                        .insert(op.data);

                    if (examError) {
                        if (examError.code === '23505') {
                            __DEV__ && console.log('[OfflineQueue] Exam session already exists, skipping');
                            return true;
                        }
                        console.error('[OfflineQueue] Exam save failed:', examError);
                        return false;
                    }

                    __DEV__ && console.log('[OfflineQueue] Exam session saved successfully');
                    return true;

                case 'preferences_save':
                    const { error: prefsError } = await supabase
                        .from('user_preferences')
                        .upsert(op.data);

                    if (prefsError) {
                        console.error('[OfflineQueue] Preferences save failed:', prefsError);
                        return false;
                    }

                    __DEV__ && console.log('[OfflineQueue] Preferences saved successfully');
                    return true;

                default:
                    console.warn('[OfflineQueue] Unknown operation type:', op.type);
                    return false;
            }
        } catch (error) {
            console.error('[OfflineQueue] Operation execution error:', error);
            return false;
        }
    }

    /**
     * Persist queue to AsyncStorage
     */
    private async persistQueue(): Promise<void> {
        try {
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
        } catch (error) {
            console.error('[OfflineQueue] Failed to persist queue:', error);
        }
    }

    /**
     * Get queue status
     */
    getStatus() {
        return {
            queueSize: this.queue.length,
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
        };
    }

    /**
     * Clear queue (for testing)
     */
    async clearQueue(): Promise<void> {
        this.queue = [];
        await this.persistQueue();
        __DEV__ && console.log('[OfflineQueue] Queue cleared');
    }
}

export default new OfflineQueueService();
