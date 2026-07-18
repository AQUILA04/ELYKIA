package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.sale.CreditTimeline;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO web pour un recouvrement (CreditTimeline) — projection plate sans relations JPA.
 */
public record CreditTimelineRespDto(
        Long id,
        String reference,
        Double amount,
        Boolean normalStake,
        Integer remainingDaysCount,
        Double totalAmountRemaining,
        String collector,
        LocalDateTime creationDate,
        String operationConsentCode,
        Double confirmedAmount,
        String syncConsentCode,
        Long creditId) {

    /** Alias attendu par certains écrans frontend. */
    public String commercialUsername() {
        return collector;
    }

    public static CreditTimelineRespDto fromId(Long id) {
        if (id == null) {
            return null;
        }
        return new CreditTimelineRespDto(id, null, null, null, null, null, null, null, null, null, null, null);
    }

    public static CreditTimelineRespDto fromEntity(CreditTimeline timeline) {
        if (timeline == null) {
            return null;
        }
        Long creditId = timeline.getCredit() != null ? timeline.getCredit().getId() : null;
        return new CreditTimelineRespDto(
                timeline.getId(),
                timeline.getReference(),
                timeline.getAmount(),
                timeline.getNormalStake(),
                timeline.getRemainingDaysCount(),
                timeline.getTotalAmountRemaining(),
                timeline.getCollector(),
                timeline.getCreatedDate(),
                timeline.getOperationConsentCode(),
                timeline.getConfirmedAmount(),
                timeline.getSyncConsentCode(),
                creditId);
    }

    public static List<CreditTimelineRespDto> fromList(List<CreditTimeline> timelines) {
        if (timelines == null) {
            return null;
        }
        return timelines.stream().map(CreditTimelineRespDto::fromEntity).toList();
    }

    public static Page<CreditTimelineRespDto> fromPage(Page<CreditTimeline> timelines) {
        if (timelines == null) {
            return null;
        }
        return timelines.map(CreditTimelineRespDto::fromEntity);
    }
}
