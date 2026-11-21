package com.optimize.common.securities.security.jwt;

import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AuthEntryPointJwtTest {

    @Test
    void commenceWritesUnauthorizedJsonPayloadWithJackson3() throws Exception {
        AuthEntryPointJwt entryPoint = new AuthEntryPointJwt();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/secured");
        request.setServletPath("/api/secured");
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(request, response, new BadCredentialsException("Bad credentials"));

        assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.getStatus());
        assertEquals(MediaType.APPLICATION_JSON_VALUE, response.getContentType());

        ObjectMapper mapper = JsonMapper.builder().build();
        Map<String, Object> body = mapper.readValue(response.getContentAsByteArray(), new TypeReference<>() {});
        assertEquals(401, body.get("status"));
        assertEquals("Unauthorized", body.get("error"));
        assertEquals("Bad credentials", body.get("message"));
        assertEquals("/api/secured", body.get("path"));
    }
}
