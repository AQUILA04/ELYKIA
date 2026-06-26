package com.optimize.elykia.core.ai.security;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.core.ai.config.AiProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class AiRateLimiter {

    private static final long ONE_MINUTE_MS = Duration.ofMinutes(1).toMillis();
    private static final long ONE_DAY_MS = Duration.ofDays(1).toMillis();
    private static final long ONE_WEEK_MS = Duration.ofDays(7).toMillis();

    private final AiProperties aiProperties;
    private final ConcurrentHashMap<Long, Deque<Long>> requestsByUser = new ConcurrentHashMap<>();

    public void check(Long userId) {
        int minuteLimit = aiProperties.getRateLimitPerUserPerMinute();
        int dailyLimit = aiProperties.getRateLimitPerUserPerDay();
        int weeklyLimit = aiProperties.getRateLimitPerUserPerWeek();
        long now = System.currentTimeMillis();
        long minuteStart = now - ONE_MINUTE_MS;
        long dayStart = now - ONE_DAY_MS;
        long weekStart = now - ONE_WEEK_MS;

        Deque<Long> timestamps = requestsByUser.computeIfAbsent(userId, id -> new ArrayDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() < weekStart) {
                timestamps.pollFirst();
            }

            long countMinute = timestamps.stream().filter(t -> t >= minuteStart).count();
            if (countMinute >= minuteLimit) {
                throw new CustomValidationException(
                        "Trop de requêtes IA (" + minuteLimit + "/minute). Réessayez dans un instant.");
            }

            long countDay = timestamps.stream().filter(t -> t >= dayStart).count();
            if (countDay >= dailyLimit) {
                throw new CustomValidationException(
                        "Quota IA atteint (" + dailyLimit + "/jour). Réessayez demain.");
            }

            if (timestamps.size() >= weeklyLimit) {
                throw new CustomValidationException(
                        "Quota IA atteint (" + weeklyLimit + "/semaine). Réessayez la semaine prochaine.");
            }

            timestamps.addLast(now);
        }
    }
}
