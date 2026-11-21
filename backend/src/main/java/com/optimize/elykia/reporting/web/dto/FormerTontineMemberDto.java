package com.optimize.elykia.reporting.web.dto;

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
