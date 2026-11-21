package com.optimize.common.entities.util;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

class ConverterTest {

    @Test
    void convertToByteImageDecodesRawAndDataUriBase64() {
        byte[] payload = "a".repeat(900).getBytes(StandardCharsets.UTF_8);
        String encoded = Base64.getEncoder().encodeToString(payload);
        String dataUri = "data:image/png;base64," + encoded;

        assertArrayEquals(payload, Converter.convertToByteImage(encoded));
        assertArrayEquals(payload, Converter.convertToByteImage(dataUri));
    }

    @Test
    void convertToByteImageReturnsEmptyForBlankOrShortInput() {
        assertEquals(0, Converter.convertToByteImage(null).length);
        assertEquals(0, Converter.convertToByteImage("").length);
        assertEquals(0, Converter.convertToByteImage("short").length);
    }
}
