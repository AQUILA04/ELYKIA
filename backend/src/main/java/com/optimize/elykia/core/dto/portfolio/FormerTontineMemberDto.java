package com.optimize.elykia.core.dto.portfolio;

public record FormerTontineMemberDto(
        Long memberId,
        Integer sessionYear,
        Long clientId,
        String clientCode,
        String firstname,
        String lastname,
        String phone,
        String quarter,
        Double ownCollectionsTotal,
        Long ownCollectionsCount
) {
}
