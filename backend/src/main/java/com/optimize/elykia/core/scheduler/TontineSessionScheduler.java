package com.optimize.elykia.core.scheduler;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.core.entity.TontineMember;
import com.optimize.elykia.core.entity.TontineSession;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
public class TontineSessionScheduler {

    private final TontineSessionRepository tontineSessionRepository;
    private final TontineMemberRepository tontineMemberRepository;

    public TontineSessionScheduler(TontineSessionRepository tontineSessionRepository, TontineMemberRepository tontineMemberRepository) {
        this.tontineSessionRepository = tontineSessionRepository;
        this.tontineMemberRepository = tontineMemberRepository;
    }

    // Runs every day at 1:00 AM
    @Scheduled(cron = "0 0 1 * * ?")
    @Transactional
    public void closeExpiredTontineSessions() {
        LocalDate today = LocalDate.now();
        List<TontineSession> expiredSessions = tontineSessionRepository.findByStatusAndEndDateBefore(TontineSessionStatus.ACTIVE, today);

        if (!expiredSessions.isEmpty()) {
            log.info("Found {} expired tontine sessions to close.", expiredSessions.size());
            for (TontineSession session : expiredSessions) {
                session.setStatus(TontineSessionStatus.CLOSED);
                tontineSessionRepository.save(session);
                log.info("Tontine session {} for year {} closed.", session.getId(), session.getYear());

                Pageable pageable = PageRequest.of(0, 100); // Process 100 members at a time
                Page<TontineMember> memberPage;
                long totalUpdated = 0;

                do {
                    memberPage = tontineMemberRepository.findByTontineSessionIdAndState(session.getId(), State.ENABLED, pageable);
                    List<TontineMember> members = memberPage.getContent();
                    if (!members.isEmpty()) {
                        members.forEach(member ->{
                            if (TontineMemberDeliveryStatus.SESSION_INPROGRESS.equals(member.getDeliveryStatus())) {
                                member.setDeliveryStatus(TontineMemberDeliveryStatus.PENDING);
                            }
                        });
                        tontineMemberRepository.saveAll(members);
                        totalUpdated += members.size();
                    }
                    pageable = memberPage.nextPageable();
                } while (memberPage.hasNext());

                log.info("Updated {} members' delivery status to PENDING for session {}.", totalUpdated, session.getId());
            }
        } else {
            log.info("No expired tontine sessions found to close.");
        }
    }

    // Runs every year on December 31st at 1:00 AM
    @Scheduled(cron = "0 0 1 31 12 ?")
    @Transactional
    public void endYearlyTontineSessions() {
        // Find all sessions that are currently CLOSED
        List<TontineSession> sessionsToEnd = tontineSessionRepository.findByStatus(TontineSessionStatus.CLOSED);

        if (!sessionsToEnd.isEmpty()) {
            log.info("Found {} tontine sessions to mark as ENDED at year end.", sessionsToEnd.size());
            for (TontineSession session : sessionsToEnd) {
                session.setStatus(TontineSessionStatus.ENDED);
                tontineSessionRepository.save(session);
                log.info("Tontine session {} for year {} marked as ENDED.", session.getId(), session.getYear());
            }
        } else {
            log.info("No CLOSED tontine sessions found to mark as ENDED at year end.");
        }
    }
}
