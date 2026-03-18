package com.optimize.elykia.core.service;

import com.optimize.elykia.core.dto.CreditCalendarDayDTO;
import com.optimize.elykia.core.dto.CreditEcheanceDTO;
import com.optimize.elykia.core.dto.CreditEcheanceSummaryDTO;
import com.optimize.elykia.core.entity.Credit;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.UrgencyLevel;
import com.optimize.elykia.core.repository.CreditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service de récupération des crédits arrivant à échéance.
 *
 * Logique de filtrage :
 *   - Seuls les crédits INPROGRESS sont considérés
 *   - Le filtre "today"  → expectedEndDate == today
 *   - Le filtre "week"   → expectedEndDate dans [today, today+6]
 *   - Le filtre "date"   → expectedEndDate == la date fournie
 *
 * Tri : par daysUntilEnd croissant (les plus urgents en tête),
 *       puis par totalAmountRemaining décroissant (les plus lourds en tête
 *       dans le même groupe).
 */
@Service
@RequiredArgsConstructor
public class CreditEcheanceService {

    private final CreditRepository creditRepository;

    private static final List<CreditStatus> ACTIVE_STATUSES = List.of(
            CreditStatus.INPROGRESS
    );

    // ─────────────────────────────────────────────────────────────────────
    // 1. Liste principale
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Crédits arrivant à terme AUJOURD'HUI.
     *
     * @param collector  username du commercial (null = tous)
     */
    public List<CreditEcheanceDTO> getForToday(String collector) {
        LocalDate today = LocalDate.now();
        return fetchAndMap(today, today, collector);
    }

    /**
     * Crédits arrivant à terme dans la SEMAINE COURANTE.
     * La semaine est définie du LUNDI au DIMANCHE contenant today.
     * Exemple : today = 18 mars 2026 (mardi) → [lundi 16 mars, dimanche 22 mars]
     *
     * @param collector  username du commercial (null = tous)
     */
    public List<CreditEcheanceDTO> getForWeek(String collector) {
        LocalDate today  = LocalDate.now();
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate sunday = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        return fetchAndMap(monday, sunday, collector);
    }

    /**
     * Crédits arrivant à terme à une date précise.
     *
     * @param date       date exacte d'échéance
     * @param collector  username du commercial (null = tous)
     */
    public List<CreditEcheanceDTO> getForDate(LocalDate date, String collector) {
        return fetchAndMap(date, date, collector);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. KPIs agrégés (en-tête de page)
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Retourne les 4 KPIs de la page, toujours calculés sur la semaine courante
     * (indépendamment du filtre de période actif dans le frontend).
     *
     * @param collector  username du commercial (null = tous)
     */
    public CreditEcheanceSummaryDTO getSummary(String collector) {
        LocalDate today  = LocalDate.now();
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate sunday = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        List<CreditEcheanceDTO> week = fetchAndMap(monday, sunday, collector);

        long   totalToday      = week.stream().filter(d -> d.getDaysUntilEnd() == 0).count();
        long   totalWeek       = week.size();
        long   totalUnsettled  = week.stream().filter(d -> !d.isSettled()).count();
        double totalRemaining  = week.stream()
                .filter(d -> !d.isSettled())
                .mapToDouble(CreditEcheanceDTO::getTotalAmountRemaining)
                .sum();

        return CreditEcheanceSummaryDTO.builder()
                .totalToday(totalToday)
                .totalWeek(totalWeek)
                .totalUnsettled(totalUnsettled)
                .totalAmountRemaining(totalRemaining)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3. Données du mini-calendrier
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Retourne, pour chaque jour d'une plage, le nombre de crédits arrivant
     * à terme. Utilisé par le composant calendrier du frontend.
     *
     * @param from       premier jour de la plage
     * @param to         dernier  jour de la plage
     * @param collector  username du commercial (null = tous)
     */
    public List<CreditCalendarDayDTO> getCalendar(LocalDate from, LocalDate to, String collector) {
        List<Credit> credits = (collector != null && !collector.isBlank())
                ? creditRepository.findActiveByEndDateBetweenAndCollector(
                        ACTIVE_STATUSES, from, to, collector)
                : creditRepository.findActiveByEndDateBetween(
                        ACTIVE_STATUSES, from, to);

        return from.datesUntil(to.plusDays(1)).map(day -> {
            List<Credit> dayCredits = credits.stream()
                    .filter(c -> day.equals(c.getExpectedEndDate()))
                    .toList();

            int unsettled = (int) dayCredits.stream()
                    .filter(c -> c.getTotalAmountRemaining() != null
                              && c.getTotalAmountRemaining() > 0)
                    .count();

            return CreditCalendarDayDTO.builder()
                    .date(day)
                    .totalCount(dayCredits.size())
                    .unsettledCount(unsettled)
                    .hasUrgent(unsettled > 0)
                    .build();
        }).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4. Liste des commerciaux ayant des crédits à échéance cette semaine
    // ─────────────────────────────────────────────────────────────────────

    public List<String> getCollectorsForWeek() {
        LocalDate today  = LocalDate.now();
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate sunday = today.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        return fetchAndMap(monday, sunday, null)
                .stream()
                .map(CreditEcheanceDTO::getCollector)
                .filter(c -> c != null && !c.isBlank())
                .distinct()
                .sorted()
                .toList();
    }

    // ─────────────────────────────────────────────────────────────────────
    // Méthode interne : requête + mapping + tri
    // ─────────────────────────────────────────────────────────────────────

    private List<CreditEcheanceDTO> fetchAndMap(LocalDate from, LocalDate to, String collector) {
        List<Credit> credits = (collector != null && !collector.isBlank())
                ? creditRepository.findActiveByEndDateBetweenAndCollector(
                        ACTIVE_STATUSES, from, to, collector)
                : creditRepository.findActiveByEndDateBetween(
                        ACTIVE_STATUSES, from, to);

        LocalDate today = LocalDate.now();

        return credits.stream()
                .map(c -> toDTO(c, today))
                .sorted(
                    Comparator.comparingInt(CreditEcheanceDTO::getDaysUntilEnd)
                    .thenComparingDouble(d -> -d.getTotalAmountRemaining())
                )
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────
    // Mapping Credit → CreditEcheanceDTO
    // ─────────────────────────────────────────────────────────────────────

    private CreditEcheanceDTO toDTO(Credit credit, LocalDate today) {

        int daysUntilEnd = credit.getExpectedEndDate() != null
                ? (int) ChronoUnit.DAYS.between(today, credit.getExpectedEndDate())
                : Integer.MAX_VALUE;

        UrgencyLevel urgency = computeUrgency(daysUntilEnd);

        double remaining = credit.getTotalAmountRemaining() != null
                ? credit.getTotalAmountRemaining() : 0.0;
        double paid      = credit.getTotalAmountPaid()      != null
                ? credit.getTotalAmountPaid()      : 0.0;
        double total     = credit.getTotalAmount()          != null
                ? credit.getTotalAmount()          : 0.0;

        int paidPct = total > 0
                ? (int) Math.round(paid / total * 100)
                : 0;

        String clientName = credit.getClient() != null
                ? credit.getClient().getLastname() + " " + credit.getClient().getFirstname()
                : "—";

        String clientPhone = credit.getClient() != null
                ? credit.getClient().getPhone()
                : null;

        return CreditEcheanceDTO.builder()
                .id(credit.getId())
                .reference(credit.getReference())
                .clientName(clientName)
                .clientPhone(clientPhone)
                .collector(credit.getCollector())
                .totalAmount(total)
                .totalAmountPaid(paid)
                .totalAmountRemaining(remaining)
                .dailyStake(credit.getDailyStake())
                .remainingDaysCount(credit.getRemainingDaysCount())
                .paidPercentage(paidPct)
                .settled(remaining == 0.0)
                .beginDate(credit.getBeginDate())
                .expectedEndDate(credit.getExpectedEndDate())
                .daysUntilEnd(daysUntilEnd)
                .urgencyLevel(urgency)
                .status(credit.getStatus())
                .build();
    }

    private UrgencyLevel computeUrgency(int days) {
        if (days == 0) return UrgencyLevel.TODAY;
        if (days == 1) return UrgencyLevel.TOMORROW;
        if (days <= 6) return UrgencyLevel.THIS_WEEK;
        return UrgencyLevel.FUTURE;
    }
}
