package com.optimize.elykia.client.storage;

public interface MinioStorageService {

    String uploadPhoto(String objectKey, byte[] data, String contentType);

    void deletePhoto(String objectKey);

    boolean exists(String objectKey);

    boolean isAvailable();
}
