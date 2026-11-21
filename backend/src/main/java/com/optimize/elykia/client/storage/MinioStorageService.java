package com.optimize.elykia.client.storage;

import java.io.InputStream;

public interface MinioStorageService {

    String uploadPhoto(String objectKey, byte[] data, String contentType);

    String uploadObject(String bucket, String objectKey, byte[] data, String contentType);

    byte[] downloadObject(String bucket, String objectKey);

    InputStream openObjectStream(String bucket, String objectKey);

    long getObjectSize(String bucket, String objectKey);

    boolean objectExists(String bucket, String objectKey);

    void deleteObject(String bucket, String objectKey);

    void deletePhoto(String objectKey);

    boolean exists(String objectKey);

    boolean isAvailable();
}
