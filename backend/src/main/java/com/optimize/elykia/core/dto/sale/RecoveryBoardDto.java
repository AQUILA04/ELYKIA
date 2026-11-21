package com.optimize.elykia.core.dto.sale;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Board de pilotage du recouvrement terrain ({@code GET /api/v1/recovery-manager/board}).
 * {@code recoveryManagerUsername} null : vue « Tous les chefs » (gestionnaire), {@code team} renseigné.
 */
@Value
@Builder
public class RecoveryBoardDto {

    public static final String SCOPE_TEAM = "TEAM";
    public static final String SCOPE_MANAGER = "MANAGER";

    String scope;
    String recoveryManagerUsername;
    LocalDate startDate;
    LocalDate endDate;

    /** Recouvré sur la période (cash terrain). */
    double collectedAmount;
    int operationsCount;
    int commercialsCount;
    /** Argent recouvré pour le compte de chaque commercial (le chef choisi, ou tous les chefs). */
    List<CommercialRemittanceDto> remittanceByCommercial;

    MonthRate monthRate;
    MonthComparison monthComparison;
    Coverage monthCoverage;
    Targets targets;

    List<DayPoint> trend;
    List<PriorityLate> priorityLate;
    List<Attention> attention;
    /** Vue « Tous les chefs » seulement. */
    List<ManagerRow> team;

    /** Taux du mois de fin de période : recouvré du mois / dû live des retards délai. */
    @Value
    @Builder
    public static class MonthRate {
        int year;
        int month;
        double collectedAmount;
        double latePortfolioDue;
        long lateCreditsCount;
        double ratePercent;
    }

    /** Recouvré du 1er au jour J du mois, comparé au 1er–J du mois précédent. */
    @Value
    @Builder
    public static class MonthComparison {
        LocalDate currentStart;
        LocalDate currentEnd;
        double currentAmount;
        LocalDate previousStart;
        LocalDate previousEnd;
        double previousAmount;
        /** Null quand le mois précédent est à zéro. */
        Double changePercent;
    }

    /** Couverture des carnets du 1er du mois à la fin de période (portefeuille en cours). */
    @Value
    @Builder
    public static class Coverage {
        int creditControlsDone;
        int creditPortfolioTotal;
        int creditCoveragePercent;
        int tontineControlsDone;
        int tontinePortfolioTotal;
        int tontineCoveragePercent;
    }

    /**
     * Objectifs des paramètres applicatifs ; null quand le paramètre est vide ou illisible.
     * {@code elapsedRatio} : part du mois écoulée à la fin de période (prorata des alertes).
     */
    @Value
    @Builder
    public static class Targets {
        Double monthlyRatePercent;
        Double coveragePercent;
        double elapsedRatio;
    }

    @Value
    @Builder
    public static class DayPoint {
        LocalDate date;
        double amount;
        int operationsCount;
    }

    @Value
    @Builder
    public static class PriorityLate {
        Long creditId;
        String reference;
        String clientName;
        String clientQuarter;
        String commercialUsername;
        /** Restant net du reliquat client. */
        double amountDue;
        int lateDays;
        LocalDate expectedEndDate;
        /** CONFORME, ECART ou null (jamais contrôlé). */
        String latestControlStatus;
        LocalDateTime latestObservedAt;
        Double latestDifferenceAmount;
        String latestObservedBy;
    }

    /**
     * Point d'attention. Types : PENDING_ECARTS, NEVER_CONTROLLED, STALE_CONTROL,
     * RATE_BELOW_TARGET, COVERAGE_BELOW_TARGET, MANAGER_INACTIVE.
     * Sévérité : HIGH ou MEDIUM.
     */
    @Value
    @Builder
    public static class Attention {
        String type;
        String severity;
        String recoveryManagerUsername;
        int count;
        double amount;
        /** Valeur observée (taux, couverture en %, jours sans opération). */
        Double value;
        /** Seuil comparé (objectif au prorata, nombre de jours). */
        Double threshold;
        List<String> commercials;
        LocalDate lastDate;
    }

    @Value
    @Builder
    public static class ManagerRow {
        String username;
        String displayName;
        double collectedAmount;
        int operationsCount;
        double monthCollectedAmount;
        double monthRatePercent;
        double previousMonthAmount;
        Double changePercent;
        int creditCoveragePercent;
        int tontineCoveragePercent;
        int creditControlsDone;
        int creditPortfolioTotal;
        int tontineControlsDone;
        int tontinePortfolioTotal;
        int ecartsCount;
        int carnetVerifications;
        LocalDate lastOperationDate;
        /** DRAFT, ACTIVE, CLOSED ou null (aucune tournée aujourd'hui). */
        String todayPlanStatus;
        List<String> todayPlanQuarters;
    }
}
