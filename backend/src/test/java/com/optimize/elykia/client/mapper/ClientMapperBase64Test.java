package com.optimize.elykia.client.mapper;

import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;

class ClientMapperBase64Test {

    private final ClientMapper mapper = Mappers.getMapper(ClientMapper.class);

    @Test
    void roundTripsBase64UsingStandardJdkEncoderAndDecoder() {
        byte[] raw = "elykia-client-photo-bytes".getBytes(StandardCharsets.UTF_8);
        String encoded = mapper.bytesToString(raw);

        assertEquals(Base64.getEncoder().encodeToString(raw), encoded);
        assertArrayEquals(raw, mapper.stringToBytes(encoded));
    }

    @Test
    void handlesNullAndEmptyInputsSafely() {
        assertEquals("", mapper.bytesToString(null));
        assertEquals("", mapper.bytesToString(new byte[0]));
        assertEquals(0, mapper.stringToBytes(null).length);
        assertEquals(0, mapper.stringToBytes("   ").length);
    }
}
