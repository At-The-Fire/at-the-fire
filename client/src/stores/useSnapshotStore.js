// stores/useSnapshotStore.js
import { create } from 'zustand';
import { fetchInventorySnapshots } from '../services/fetch-inventory.js';

const useSnapshotStore = create((set) => ({
  // State
  snapshots: [],
  inventoryLoading: true,

  // Actions to update state
  setInventoryLoading: (loading) => set({ inventoryLoading: loading }),

  setSnapshots: (newSnapshots) => set({ snapshots: newSnapshots }),

  fetchSnapshots: async (user, isAuthenticated, customerId) => {
    if (!user || !isAuthenticated || !customerId) {
      return;
    }

    set({ inventoryLoading: true }); // Here's where we set loading to true
    try {
      const data = await fetchInventorySnapshots();
      if (data === null) {
        return;
      }
      set({
        snapshots: data,
        inventoryLoading: false, // Here's where we set loading to false
      });
    } catch (error) {
      set({ inventoryLoading: false }); // Don't forget to set false on error too
    }
  },

  addSnapshot: (newSnapshot) =>
    set((state) => {
      if (state.snapshots.length === 0) return { snapshots: [newSnapshot] };

      // Filter out any snapshot with the same ID
      const filteredSnapshots = state.snapshots.filter(
        (snapshot) => snapshot.id !== newSnapshot.id
      );

      return { snapshots: [...filteredSnapshots, newSnapshot] };
    }),
}));

export default useSnapshotStore;
