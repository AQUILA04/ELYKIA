package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.report.TontineCollectionResetRun;
import com.optimize.elykia.core.enumaration.TontineCollectionResetRunStatus;
import com.optimize.elykia.core.enumaration.TontineCollectionResetScope;

import java.time.LocalDateTime;

public record TontineCollectionResetRunDto(
        Long id,
        Long sessionId,
        Integer sessionYear,
        TontineCollectionResetRunStatus status,
        String triggeredBy,
        Integer collectionsCount,
        Double collectionsAmount,
        Integer membersResetCount,
        Integer pdfFileCount,
        String errorMessage,
        LocalDateTime createdDate,
        TontineCollectionResetScope scope,
        String targetCommercialUsername
) {
    public static TontineCollectionResetRunDto from(TontineCollectionResetRun run) {
        return new TontineCollectionResetRunDto(
                run.getId(),
                run.getSessionId(),
                run.getSessionYear(),
                run.getStatus(),
                run.getTriggeredBy(),
                run.getCollectionsCount(),
                run.getCollectionsAmount(),
                run.getMembersResetCount(),
                run.getPdfFileCount(),
                run.getErrorMessage(),
                run.getCreatedDate(),
                run.getScope() != null ? run.getScope() : TontineCollectionResetScope.SESSION,
                run.getTargetCommercialUsername()
        );
    }
}
