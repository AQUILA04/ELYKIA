package com.optimize.elykia.core.ai.security;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.ai.config.AiProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiRateLimiterTest {

    @Mock
    private AiProperties aiProperties;

    private AiRateLimiter rateLimiter;

    @BeforeEach
    void setUp() {
        when(aiProperties.getRateLimitPerUserPerMinute()).thenReturn(2);
        when(aiProperties.getRateLimitPerUserPerDay()).thenReturn(10);
        when(aiProperties.getRateLimitPerUserPerWeek()).thenReturn(20);
        rateLimiter = new AiRateLimiter(aiProperties);
    }

    @Test
    void allowsRequestsUnderAllLimits() {
        assertDoesNotThrow(() -> {
            rateLimiter.check(42L);
            rateLimiter.check(42L);
        });
    }

    @Test
    void rejectsWhenMinuteLimitExceeded() {
        rateLimiter.check(7L);
        rateLimiter.check(7L);
        assertThrows(CustomValidationException.class, () -> rateLimiter.check(7L));
    }

    @Test
    void rejectsWhenDailyLimitExceeded() {
        when(aiProperties.getRateLimitPerUserPerMinute()).thenReturn(10);
        for (int i = 0; i < 10; i++) {
            rateLimiter.check(8L);
        }
        assertThrows(CustomValidationException.class, () -> rateLimiter.check(8L));
    }

    @Test
    void rejectsWhenWeeklyLimitExceededEvenIfDailyOk() {
        when(aiProperties.getRateLimitPerUserPerMinute()).thenReturn(50);
        when(aiProperties.getRateLimitPerUserPerDay()).thenReturn(50);
        when(aiProperties.getRateLimitPerUserPerWeek()).thenReturn(5);
        for (int i = 0; i < 5; i++) {
            rateLimiter.check(9L);
        }
        assertThrows(CustomValidationException.class, () -> rateLimiter.check(9L));
    }

    @Test
    void isolatesLimitsPerUser() {
        rateLimiter.check(1L);
        rateLimiter.check(1L);
        assertDoesNotThrow(() -> rateLimiter.check(2L));
    }
}
