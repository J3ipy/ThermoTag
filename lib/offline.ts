export type PendingCheckin = { id: string; tagId: string; stage: string; place: string; actor: string; status: "normal" | "alert"; latitude: number | null; longitude: number | null; capturedAt: string; photo: string; sampledColor: string; justification: string };

const DB_NAME = "thermotag-offline-v1";
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { const db = request.result; db.createObjectStore("pending", { keyPath: "id" }); db.createObjectStore("cache"); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(store: "pending" | "cache", mode: IDBTransactionMode, action: (object: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = action(tx.objectStore(store));
    let value: T;
    req.onsuccess = () => { value = req.result; };
    tx.oncomplete = () => { db.close(); resolve(value); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

export const pendingCheckins = () => transact<PendingCheckin[]>("pending", "readonly", store => store.getAll());
export const queueCheckin = (entry: PendingCheckin) => transact("pending", "readwrite", store => store.put(entry));
export const removeCheckin = (id: string) => transact("pending", "readwrite", store => store.delete(id));
export const saveShipments = (value: unknown) => transact("cache", "readwrite", store => store.put(value, "shipments"));
export const cachedShipments = <T>() => transact<T | undefined>("cache", "readonly", store => store.get("shipments"));
