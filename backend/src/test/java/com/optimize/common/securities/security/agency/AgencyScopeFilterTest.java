package com.optimize.common.securities.security.agency;

import com.optimize.common.securities.security.services.UserDetailsImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AgencyScopeFilterTest {

    private final AgencyScopeFilter filter = new AgencyScopeFilter();

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        AgencyContext.clear();
    }

    @Test
    void terrainUserWithoutAgencyId_isRejectedWith403() throws Exception {
        UserDetailsImpl user = new UserDetailsImpl(10L, "promoter1", "p@e.com", "pw", List.of(), "PROMOTER", null);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));

        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/clients");
        MockHttpServletResponse res = new MockHttpServletResponse();
        FilterChain chain = (request, response) -> {
            throw new AssertionError("Filter chain should not proceed when agencyId is missing");
        };

        filter.doFilter(req, res, chain);

        assertEquals(HttpServletResponse.SC_FORBIDDEN, res.getStatus());
        assertNull(AgencyContext.getCurrentAgencyId());
    }

    @Test
    void cashierUserWithAgencyId_populatesAgencyContextAndClearsAfterward() throws Exception {
        assertTrue(AgencyProfils.isTerrain("CASHIER"));
        UserDetailsImpl user = new UserDetailsImpl(11L, "cashier1", "c@e.com", "pw", List.of(), "CASHIER", 7L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));

        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/cash-sales-register/current");
        MockHttpServletResponse res = new MockHttpServletResponse();
        AtomicReference<Long> seenInChain = new AtomicReference<>();
        FilterChain chain = (request, response) -> seenInChain.set(AgencyContext.getCurrentAgencyId());

        filter.doFilter(req, res, chain);

        assertEquals(HttpServletResponse.SC_OK, res.getStatus());
        assertEquals(7L, seenInChain.get());
        assertNull(AgencyContext.getCurrentAgencyId());
    }

    @Test
    void globalUserWithoutAgencyId_passesWithoutRestriction() throws Exception {
        assertTrue(AgencyProfils.isGlobal("ADMIN"));
        UserDetailsImpl user = new UserDetailsImpl(1L, "admin", "a@e.com", "pw", List.of(), "ADMIN", null);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));

        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/v1/clients");
        MockHttpServletResponse res = new MockHttpServletResponse();
        AtomicReference<Boolean> called = new AtomicReference<>(false);
        FilterChain chain = (request, response) -> called.set(true);

        filter.doFilter(req, res, chain);

        assertTrue(called.get());
        assertEquals(HttpServletResponse.SC_OK, res.getStatus());
        assertNull(AgencyContext.getCurrentAgencyId());
    }
}
