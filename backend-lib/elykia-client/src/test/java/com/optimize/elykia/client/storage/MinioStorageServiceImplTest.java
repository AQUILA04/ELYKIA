package com.optimize.elykia.client.storage;

import io.minio.PutObjectArgs;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class MinioStorageServiceImplTest {

    @Test
    void constructsMinioClientAndPutObjectArgsWithMinio9AndOkHttp5() {
        MinioProperties props = new MinioProperties();
        props.setEndpoint("http://localhost:9000");
        props.setAccessKey("test-access");
        props.setSecretKey("test-secret");
        props.setBucket("elykia-clients");

        MinioStorageServiceImpl service = new MinioStorageServiceImpl(props);
        assertNotNull(service);

        byte[] data = "sample-photo-bytes".getBytes(StandardCharsets.UTF_8);
        PutObjectArgs args = PutObjectArgs.builder()
                .bucket("elykia-clients")
                .object("clients/1/profil.webp")
                .stream(new ByteArrayInputStream(data), (long) data.length, null)
                .contentType("image/webp")
                .build();

        assertEquals("elykia-clients", args.bucket());
        assertEquals("clients/1/profil.webp", args.object());
        assertEquals(data.length, args.objectSize());
    }
}
