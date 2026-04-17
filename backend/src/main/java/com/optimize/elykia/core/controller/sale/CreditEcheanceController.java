package com.optimize.elykia.core.controller.sale;

import com.optimize.common.entities.util.Response;
import com.optimize.common.entities.util.ResponseUtil;
import com.optimize.elykia.core.service.CreditEcheanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * Controller pour la page "Crédits à échéance".
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  Endpoint                             Description                   │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  GET /api/v1/credits/echeance/summary    KPIs agrégés (4 cartes)   │
 * │  GET /api/v1/credits/echeance/today      Crédits du jour           │
 * │  GET /api/v1/credits/echeance/week       Crédits des 7 prochains j.│
 * │  GET /api/v1/credits/echeance/date       Crédits d'une date précise│
 * │  GET /api/v1/credits/echeance/calendar   Données mini-calendrier   │
 * │  GET /api/v1/credits/echeance/collectors Commerciaux disponibles   │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Paramètre commun : ?collector=jean.nkrumah  (optionnel, filtre le résultat)
 */
@RestController
@RequestMapping("/api/v1/credits/echeance")
@RequiredArgsConstructor
public class CreditEcheanceController {

    private final CreditEcheanceService creditEcheanceService;

    // ── KPIs ──────────────────────────────────────────────────────────────

    /**
     * GET /api/v1/credits/echeance/summary
     *
     * Retourne les 4 indicateurs pour l'en-tête de page.
     * Toujours calculés sur la semaine courante (today → today+6).
     */
    @GetMapping("/summary")
    public ResponseEntity<Response> getSummary(
            @RequestParam(required = false) String collector) {

        return ResponseEntity.ok(ResponseUtil.successResponse(creditEcheanceService.getSummary(collector)));
    }

    // ── Listes principales ────────────────────────────────────────────────

    /**
     * GET /api/v1/credits/echeance/today
     *
     * Crédits dont expectedEndDate == today.
     * Triés : urgency ASC, totalAmountRemaining DESC.
     *
     * @param collector  (optionnel) filtrer par commercial
     */
    @GetMapping("/today")
    public ResponseEntity<Response> getForToday(
            @RequestParam(required = false) String collector) {

        return ResponseEntity.ok(ResponseUtil.successResponse(creditEcheanceService.getForToday(collector)));
    }

    /**
     * GET /api/v1/credits/echeance/week
     *
     * Crédits dont expectedEndDate ∈ [today, today+6].
     *
     * @param collector  (optionnel) filtrer par commercial
     */
    @GetMapping("/week")
    public ResponseEntity<Response> getForWeek(
            @RequestParam(required = false) String collector) {

        return ResponseEntity.ok(ResponseUtil.successResponse(creditEcheanceService.getForWeek(collector)));
    }

    /**
     * GET /api/v1/credits/echeance/date?date=2024-06-15
     *
     * Crédits dont expectedEndDate == la date fournie.
     * Utilisé par le sélecteur "Date précise" du frontend.
     *
     * @param date       date au format ISO (yyyy-MM-dd) — obligatoire
     * @param collector  (optionnel) filtrer par commercial
     */
    @GetMapping("/date")
    public ResponseEntity<Response> getForDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String collector) {

        return ResponseEntity.ok(ResponseUtil.successResponse(creditEcheanceService.getForDate(date, collector)));
    }

    // ── Calendrier ────────────────────────────────────────────────────────

    /**
     * GET /api/v1/credits/echeance/calendar?from=2024-06-10&to=2024-06-16
     *
     * Retourne, pour chaque jour de la plage, le nombre de crédits et
     * le flag "hasUrgent". Utilisé par le mini-calendrier semaine.
     *
     * @param from  premier jour de la plage (ISO)
     * @param to    dernier  jour de la plage (ISO)
     */
    @GetMapping("/calendar")
    public ResponseEntity<Response> getCalendar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) String collector) {

        return ResponseEntity.ok(ResponseUtil.successResponse(creditEcheanceService.getCalendar(from, to, collector)));
    }

    // ── Commerciaux ───────────────────────────────────────────────────────

    /**
     * GET /api/v1/credits/echeance/collectors
     *
     * Liste distincte et triée des commerciaux ayant au moins un crédit
     * arrivant à terme cette semaine. Utilisée pour peupler le select de
     * filtrage dans le frontend.
     */
    @GetMapping("/collectors")
    public ResponseEntity<Response> getCollectors() {
        return ResponseEntity.ok(ResponseUtil.successResponse(creditEcheanceService.getCollectorsForWeek()));
    }
}
