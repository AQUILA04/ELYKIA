package com.optimize.elykia.recruitment.shared.infrastructure.storage;

import java.io.InputStream;

public interface RecruitmentStoragePort {

    StoredOfferImage storeOfferImage(long offerId, byte[] data, String contentType);

    void deleteOfferImage(String bucket, String key);

    void storeApplicationCv(long applicationId, byte[] data, String contentType, String fileName);

    byte[] loadCv(String bucket, String key);

    InputStream openCvStream(String bucket, String key);

    record StoredOfferImage(String bucket, String key, String publicUrl) {
    }
}
