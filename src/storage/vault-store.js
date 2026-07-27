(function (global) {
  "use strict";

  var DB_NAME = "mindpulse-local-vault";
  var DB_VERSION = 2;
  var STORE_NAME = "vault_records";
  var SCHEMA_VERSION = 2;

  function assertVaultId(vaultId) {
    if (!vaultId || typeof vaultId !== "string") {
      throw new Error("vaultId is required");
    }
  }

  function openDatabase() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      var request = global.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = function () {
        var db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "vaultId" });
        }
      };
      request.onsuccess = function () {
        var db = request.result;
        db.onversionchange = function () { db.close(); };
        resolve(db);
      };
      request.onerror = function () {
        reject(request.error || new Error("IndexedDB open failed"));
      };
      request.onblocked = function () {
        reject(new Error("IndexedDB upgrade is blocked by another tab"));
      };
    });
  }

  function closeDatabase(db) {
    if (db && typeof db.close === "function") db.close();
  }

  function openVault(vaultId) {
    assertVaultId(vaultId);
    return openDatabase().then(function (db) {
      return { db: db, vaultId: vaultId };
    });
  }

  function readVault(vaultId) {
    return openVault(vaultId).then(function (handle) {
      return new Promise(function (resolve, reject) {
        var request;
        try {
          request = handle.db.transaction(STORE_NAME, "readonly")
            .objectStore(STORE_NAME)
            .get(handle.vaultId);
        } catch (error) {
          closeDatabase(handle.db);
          reject(error);
          return;
        }
        request.onsuccess = function () {
          var value = request.result || null;
          closeDatabase(handle.db);
          resolve(value);
        };
        request.onerror = function () {
          var error = request.error || new Error("IndexedDB read failed");
          closeDatabase(handle.db);
          reject(error);
        };
      });
    });
  }

  function writeVault(vaultId, state) {
    assertVaultId(vaultId);
    var snapshot = state && typeof state === "object" ? state : {};
    var record = Object.assign({}, snapshot, {
      vaultId: vaultId,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString()
    });
    return openVault(vaultId).then(function (handle) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try {
          transaction = handle.db.transaction(STORE_NAME, "readwrite");
          transaction.objectStore(STORE_NAME).put(record);
        } catch (error) {
          closeDatabase(handle.db);
          reject(error);
          return;
        }
        transaction.oncomplete = function () {
          closeDatabase(handle.db);
          resolve(record);
        };
        transaction.onerror = function () {
          var error = transaction.error || new Error("IndexedDB write failed");
          closeDatabase(handle.db);
          reject(error);
        };
        transaction.onabort = function () {
          var error = transaction.error || new Error("IndexedDB write aborted");
          closeDatabase(handle.db);
          reject(error);
        };
      });
    });
  }

  function deleteVault(vaultId) {
    assertVaultId(vaultId);
    return openVault(vaultId).then(function (handle) {
      return new Promise(function (resolve, reject) {
        var transaction;
        try {
          transaction = handle.db.transaction(STORE_NAME, "readwrite");
          transaction.objectStore(STORE_NAME).delete(handle.vaultId);
        } catch (error) {
          closeDatabase(handle.db);
          reject(error);
          return;
        }
        transaction.oncomplete = function () {
          closeDatabase(handle.db);
          resolve(true);
        };
        transaction.onerror = function () {
          var error = transaction.error || new Error("IndexedDB delete failed");
          closeDatabase(handle.db);
          reject(error);
        };
        transaction.onabort = function () {
          var error = transaction.error || new Error("IndexedDB delete aborted");
          closeDatabase(handle.db);
          reject(error);
        };
      });
    });
  }

  function migrateLegacyState(vaultId, legacyState) {
    var state = legacyState && typeof legacyState === "object" ? legacyState : {};
    return writeVault(vaultId, Object.assign({}, state, {
      migratedFrom: "legacy-localStorage",
      migratedAt: new Date().toISOString()
    }));
  }

  global.MindPulseVaultStore = {
    openVault: openVault,
    readVault: readVault,
    writeVault: writeVault,
    deleteVault: deleteVault,
    migrateLegacyState: migrateLegacyState,
    schemaVersion: SCHEMA_VERSION
  };
})(typeof window !== "undefined" ? window : globalThis);
