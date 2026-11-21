package com.optimize.common.securities.controllers;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.optimize.common.entities.config.CustomMessageSource;
import com.optimize.common.entities.controller.ClientServerErrorLog;
import com.optimize.common.entities.util.Response;
import jakarta.servlet.ServletException;
import org.apache.catalina.connector.ClientAbortException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AdviceControllerClientDisconnectTest {

    private AdviceController controller;
    private ListAppender<ILoggingEvent> clientErrors;
    private ListAppender<ILoggingEvent> eventLog;

    @BeforeEach
    void setUp() {
        CustomMessageSource source = new CustomMessageSource();
        source.setUseCodeAsDefaultMessage(true);
        controller = new AdviceController(source);
        clientErrors = attach(ClientServerErrorLog.class.getName());
        eventLog = attach("EventLog");
    }

    @AfterEach
    void tearDown() {
        detach(ClientServerErrorLog.class.getName(), clientErrors);
        detach("EventLog", eventLog);
    }

    @Test
    void asyncRequestNotUsableDoesNotNotifyOrWriteABody() {
        AsyncRequestNotUsableException ex = new AsyncRequestNotUsableException(
                "ServletOutputStream failed to flush/write: java.io.IOException: Broken pipe",
                new IOException("Broken pipe"));

        assertNull(controller.handleException(ex));
        assertNoClient500();
        assertNoErrorLog();
    }

    @Test
    void clientAbortAndBrokenPipeInTheCauseChainStayQuiet() {
        assertNull(controller.handleException(new ClientAbortException("java.io.IOException: Broken pipe")));
        assertNull(controller.handleException(new ServletException(
                new ClientAbortException(new IOException("Broken pipe")))));
        assertNull(controller.handleException(new IllegalStateException(
                "write failed", new IOException("Connection reset by peer"))));
        assertNull(controller.handleException(new IOException("Broken pipe")));

        assertNoClient500();
        assertNoErrorLog();
    }

    @Test
    void unrelatedIoExceptionIsStillAServerError() {
        ResponseEntity<Response> response = controller.handleException(new IOException("No space left on device"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertTrue(clientErrors.list.stream().anyMatch(event ->
                event.getLevel() == Level.ERROR && event.getFormattedMessage().contains("CLIENT_500")));
    }

    private void assertNoClient500() {
        assertTrue(clientErrors.list.stream().noneMatch(event ->
                event.getFormattedMessage().contains("CLIENT_500")));
    }

    private void assertNoErrorLog() {
        assertTrue(eventLog.list.stream().noneMatch(event -> event.getLevel() == Level.ERROR));
    }

    private static ListAppender<ILoggingEvent> attach(String name) {
        Logger logger = (Logger) LoggerFactory.getLogger(name);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        return appender;
    }

    private static void detach(String name, ListAppender<ILoggingEvent> appender) {
        Logger logger = (Logger) LoggerFactory.getLogger(name);
        logger.detachAppender(appender);
    }
}
