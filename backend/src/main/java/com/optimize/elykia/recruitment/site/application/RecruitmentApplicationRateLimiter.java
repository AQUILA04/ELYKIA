package com.optimize.elykia.recruitment.site.application;

import com.optimize.common.entities.exception.ApplicationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class RecruitmentApplicationRateLimiter {

    private final com.optimize.elykia.recruitment.site.config.RecruitmentSiteProperties siteProperties;
    private final Map<String, List<Instant>> attemptsByIp = new ConcurrentHashMap<>();

    public void check(String clientIp) {
        int limit = siteProperties.getMaxApplicationsPerIpPerHour();
        Instant oneHourAgo = Instant.now().minusSeconds(3600);
        List<Instant> attempts = attemptsByIp.computeIfAbsent(clientIp, k -> new ArrayList<>());
        synchronized (attempts) {
            attempts.removeIf(t -> t.isBefore(oneHourAgo));
            if (attempts.size() >= limit) {
                throw new ApplicationException("Trop de candidatures envoyées. Réessayez plus tard.");
            }
            attempts.add(Instant.now());
        }
    }
}
