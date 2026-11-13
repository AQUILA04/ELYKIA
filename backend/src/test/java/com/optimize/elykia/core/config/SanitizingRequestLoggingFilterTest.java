package com.optimize.elykia.core.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.filter.CommonsRequestLoggingFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SanitizingRequestLoggingFilterTest {

    private SanitizingRequestLoggingFilter filter;
    private ListAppender<ILoggingEvent> logs;
    private Logger logger;

    @BeforeEach
    void setUp() {
        filter = new SanitizingRequestLoggingFilter();
        filter.setIncludeQueryString(true);
        filter.setIncludePayload(true);
        filter.setMaxPayloadLength(10_000);
        filter.setIncludeHeaders(false);
        logger = (Logger) LoggerFactory.getLogger(CommonsRequestLoggingFilter.class);
        logger.setLevel(Level.DEBUG);
        logs = new ListAppender<>();
        logs.start();
        logger.addAppender(logs);
        ((Logger) LoggerFactory.getLogger(SanitizingRequestLoggingFilter.class)).setLevel(Level.DEBUG);
        ((Logger) LoggerFactory.getLogger(SanitizingRequestLoggingFilter.class)).addAppender(logs);
    }

    @AfterEach
    void tearDown() {
        logger.detachAppender(logs);
        ((Logger) LoggerFactory.getLogger(SanitizingRequestLoggingFilter.class)).detachAppender(logs);
    }

    @Test
    void signinBodyIsOmittedFromTheLog() throws ServletException, IOException {
        String json = "{\"username\":\"ada\",\"password\":\"s3cret-plain\"}";
        String payload = readPayload(jsonRequest("/api/auth/signin", json));
        filter.doFilter(jsonRequest("/api/auth/signin", json), new MockHttpServletResponse(),
                (req, res) -> req.getInputStream().readAllBytes());

        assertEquals(SanitizingRequestLoggingFilter.OMITTED_BODY, payload);
        String logged = loggedText();
        assertTrue(logged.contains(SanitizingRequestLoggingFilter.OMITTED_BODY));
        assertFalse(logged.contains("s3cret-plain"));
    }

    @Test
    void passwordLikeFieldsAreMaskedOnOtherEndpoints() throws ServletException, IOException {
        String body = "{\"note\":\"visible\",\"oldPassword\":\"old-secret\",\"newPassword\":\"new-secret\",\"token\":\"jwt-value\"}";
        String payload = readPayload(jsonRequest("/api/v1/users/password", body));
        filter.doFilter(jsonRequest("/api/v1/users/password", body), new MockHttpServletResponse(),
                (req, res) -> req.getInputStream().readAllBytes());

        assertTrue(payload.contains("\"note\":\"visible\""));
        assertFalse(payload.contains("old-secret"));
        assertFalse(payload.contains("new-secret"));
        assertFalse(payload.contains("jwt-value"));
        assertTrue(payload.contains("***"));

        String logged = loggedText();
        assertFalse(logged.contains("old-secret"));
        assertFalse(logged.contains("new-secret"));
        assertFalse(logged.contains("jwt-value"));
        assertTrue(logged.contains("visible"));
    }

    @Test
    void formAndJsonSecretsAreMaskedGenerically() {
        assertEquals(
                "{\"username\":\"ada\",\"password\":\"***\"}",
                RequestPayloadSanitizer.mask("{\"username\":\"ada\",\"password\":\"s3cret-plain\"}"));
        assertEquals(
                "username=ada&password=***&newPassword=***",
                RequestPayloadSanitizer.mask("username=ada&password=form-secret&newPassword=next-secret"));
        assertEquals("bonjour", RequestPayloadSanitizer.mask("bonjour"));
        assertTrue(RequestPayloadSanitizer.isAuthPath("/api/auth/signin"));
        assertFalse(RequestPayloadSanitizer.isAuthPath("/api/v1/users/password"));
    }

    private String readPayload(MockHttpServletRequest request) throws IOException {
        request.setContent(request.getContentAsByteArray());
        ContentCachingRequestWrapper wrapper = new ContentCachingRequestWrapper(request);
        wrapper.getInputStream().readAllBytes();
        return filter.getMessagePayload(wrapper);
    }

    private static MockHttpServletRequest jsonRequest(String uri, String json) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", uri);
        request.setContentType("application/json");
        request.setContent(json.getBytes(StandardCharsets.UTF_8));
        return request;
    }

    private String loggedText() {
        return logs.list.stream().map(ILoggingEvent::getFormattedMessage).reduce("", (a, b) -> a + "\n" + b);
    }
}
