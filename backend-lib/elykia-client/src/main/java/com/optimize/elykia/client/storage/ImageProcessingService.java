package com.optimize.elykia.client.storage;

public interface ImageProcessingService {

    byte[] generateThumbnail(byte[] original, int width, int height);
}
