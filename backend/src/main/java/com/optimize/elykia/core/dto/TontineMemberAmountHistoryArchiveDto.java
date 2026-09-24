package com.optimize.elykia.core.dto;

import com.optimize.elykia.core.entity.tontine.TontineMemberAmountHistoryArchive;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

public record TontineMemberAmountHistoryArchiveDto(
        Long id,
        Long memberId,
        String batchId,
        Double amount,
        LocalDate startDate,
        LocalDate endDate,
        LocalDateTime originalCreationDate,
        LocalDateTime archivedAt,
        String archivedBy,
        Double newAmount) {

    public static TontineMemberAmountHistoryArchiveDto fromEntity(TontineMemberAmountHistoryArchive archive) {
        if (Objects.isNull(archive)) {
            return null;
        }
        return new TontineMemberAmountHistoryArchiveDto(
                archive.getId(),
                archive.getTontineMember() != null ? archive.getTontineMember().getId() : null,
                archive.getBatchId(),
                archive.getAmount(),
                archive.getStartDate(),
                archive.getEndDate(),
                archive.getOriginalCreationDate(),
                archive.getArchivedAt(),
                archive.getArchivedBy(),
                archive.getNewAmount());
    }

    public static List<TontineMemberAmountHistoryArchiveDto> fromList(List<TontineMemberAmountHistoryArchive> archives) {
        if (archives == null || archives.isEmpty()) {
            return List.of();
        }
        return archives.stream()
                .map(TontineMemberAmountHistoryArchiveDto::fromEntity)
                .toList();
    }
}
