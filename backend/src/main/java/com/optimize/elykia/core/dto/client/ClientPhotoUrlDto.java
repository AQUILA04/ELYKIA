package com.optimize.elykia.core.dto.client;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ClientPhotoUrlDto {
    private Long clientId;
    /** Null when the object is missing or still stored in legacy PhotoStore. */
    private String url;
    private Instant expiresAt;
    /**
     * True when the client has no MinIO URL for this kind — photo may still live in PhotoStore.
     * Callers should use the legacy stream/batch endpoints (transitional).
     */
    private boolean legacy;
}
