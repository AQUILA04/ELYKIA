package com.optimize.common.entities.controller;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ClientServerErrorLogTest {

    @Test
    void formatKeepsTheMessageReturnedToTheClientOnOneLine() {
        assertEquals("erreur interne", ClientServerErrorLog.format(null));
        assertEquals("erreur interne", ClientServerErrorLog.format("  \n"));
        assertEquals("a b", ClientServerErrorLog.format("a\n\tb"));
        assertEquals(220, ClientServerErrorLog.format("x".repeat(300)).length());
    }
}
