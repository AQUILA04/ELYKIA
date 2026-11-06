package com.optimize.elykia.core.dto.portfolio;

import java.util.List;

public record FormerPortfolioSyncDto(
        List<FormerTontineMemberDto> tontineMembers,
        List<FormerTontineCollectionDto> tontineCollections,
        List<FormerCreditListItemDto> credits,
        List<FormerCreditTimelineDto> creditTimelines,
        List<FormerAgencySaleDto> agencySales
) {
}
