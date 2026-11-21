package com.optimize.common.securities.security.jwt;

import com.optimize.common.securities.security.services.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtUtilsTest {

    private static final String TEST_SECRET = Base64.getEncoder()
            .encodeToString("elykia-jwt-unit-test-secret-key-256-bits-minimum-length".getBytes(StandardCharsets.UTF_8));

    private JwtUtils jwtUtils;

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(jwtUtils, "jwtSecret", TEST_SECRET);
        ReflectionTestUtils.setField(jwtUtils, "jwtExpirationMs", 60_000);
    }

    @Test
    void generateValidateAndExtractUsernameFromAuthenticationToken() {
        UserDetailsImpl principal = new UserDetailsImpl(
                1L, "promoter1", "p@example.com", "secret",
                List.of(new SimpleGrantedAuthority("ROLE_USER")), "PROMOTER");
        Authentication auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());

        String token = jwtUtils.generateJwtToken(auth);

        assertTrue(jwtUtils.validateJwtToken(token));
        assertEquals("promoter1", jwtUtils.getUserNameFromJwtToken(token));
    }

    @Test
    void generateTokenFromUsernameProducesValidSignedToken() {
        String token = jwtUtils.generateTokenFromUsername("admin1");

        assertTrue(jwtUtils.validateJwtToken(token));
        assertEquals("admin1", jwtUtils.getUserNameFromJwtToken(token));
    }

    @Test
    void validateJwtTokenRejectsExpiredTamperedMalformedAndBlankTokens() {
        String validToken = jwtUtils.generateTokenFromUsername("user1");
        String tamperedToken = validToken.substring(0, validToken.length() - 2) + "xx";

        assertFalse(jwtUtils.validateJwtToken(tamperedToken));
        assertFalse(jwtUtils.validateJwtToken("not-a-jwt"));
        assertFalse(jwtUtils.validateJwtToken(""));

        ReflectionTestUtils.setField(jwtUtils, "jwtExpirationMs", -1_000);
        String expiredToken = jwtUtils.generateTokenFromUsername("user1");
        assertFalse(jwtUtils.validateJwtToken(expiredToken));
    }
}
