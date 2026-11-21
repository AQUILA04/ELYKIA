package com.optimize.elykia.reporting.domain;

public enum MonthlyReportRunStatus {
    PENDING,
    AGGREGATING,
    GENERATING,
    COMPLETED,
    COMPLETED_WITH_PENDING,
    PARTIAL,
    FAILED
}
