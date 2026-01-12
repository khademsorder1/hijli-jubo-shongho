class SyncManager {
    constructor(db, offlineDB) {
        this.db = db;
        this.offlineDB = offlineDB;
        this.isOnline = navigator.onLine;
        this.pendingOperations = [];
    }
    
    async syncData() {
        if (!this.isOnline) {
            console.log("Offline mode - saving to IndexedDB");
            return false;
        }
        
        // Sync pending operations
        for (const operation of this.pendingOperations) {
            try {
                await this.executeOperation(operation);
            } catch (error) {
                console.error("Sync failed:", error);
            }
        }
        
        // Clear pending operations
        this.pendingOperations = [];
        
        return true;
    }
    
    async executeOperation(operation) {
        switch (operation.type) {
            case 'add_member':
                await addDoc(collection(this.db, "members"), operation.data);
                break;
            case 'add_donation':
                await addDoc(collection(this.db, "donations"), operation.data);
                break;
            case 'add_proof':
                await addDoc(collection(this.db, "donation_proofs"), operation.data);
                break;
            case 'update_profile':
                await updateDoc(doc(this.db, "members", operation.id), operation.data);
                break;
        }
    }
    
    async addOperation(operation) {
        this.pendingOperations.push(operation);
        await this.offlineDB.saveData('pending_ops', operation);
        
        // Try to sync immediately
        if (this.isOnline) {
            await this.syncData();
        }
    }
}