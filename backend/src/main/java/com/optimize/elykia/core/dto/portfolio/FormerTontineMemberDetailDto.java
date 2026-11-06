package com.optimize.elykia.core.dto.portfolio;

import java.util.List;

public record FormerTontineMemberDetailDto(
        Long memberId,
        Integer sessionYear,
        Long clientId,
        String clientCode,
        String firstname,
        String lastname,
        String phone,
        String quarter,
        Double ownCollectionsTotal,
        List<FormerTontineCollectionDto> collections
) {
}
