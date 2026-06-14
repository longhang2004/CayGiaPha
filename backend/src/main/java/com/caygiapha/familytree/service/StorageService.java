package com.caygiapha.familytree.service;

/**
 * Object-storage abstraction for binary content such as person photos (Requirement 24.7). The
 * backend stores only an object key + metadata in the database and the bytes here, so it is
 * agnostic to the concrete store. The default implementation writes to a local directory
 * ({@code FilesystemStorageService}); a production deployment binds an S3-compatible implementation
 * (e.g. MinIO, see {@code docker-compose.yml}) behind this same interface.
 */
public interface StorageService {

    /** Store {@code content} under {@code key}, overwriting any existing object at that key. */
    void put(String key, byte[] content, String contentType);

    /** Read the bytes stored under {@code key}. */
    byte[] get(String key);

    /** Delete the object at {@code key}; a no-op when it does not exist. */
    void delete(String key);
}
