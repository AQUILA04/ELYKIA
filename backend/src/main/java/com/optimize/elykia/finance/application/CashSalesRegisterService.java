package com.optimize.elykia.finance.application;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.finance.api.CashSalesRegisterPort;
import com.optimize.elykia.finance.domain.CashSalesRegisterEntry;
import com.optimize.elykia.finance.domain.CashSalesRegisterEntryType;
import com.optimize.elykia.finance.domain.CashSalesRegisterSession;
import com.optimize.elykia.finance.domain.CashSalesRegisterStatus;
import com.optimize.elykia.finance.infrastructure.persistence.CashSalesRegisterEntryRepository;
import com.optimize.elykia.finance.infrastructure.persistence.CashSalesRegisterSessionRepository;
import com.optimize.elykia.finance.web.dto.CashSalesRegisterSummaryDto;
import com.optimize.elykia.shared.security.UserPermissionConstant;
import com.optimize.elykia.shared.security.UserProfilConstant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

/**
 * Caisse dédiée aux ventes au comptant en agence, autonome (sans dépendance à {@code AccountingDay}).
 * <ul>
 *   <li>Peuvent vendre en caisse : {@code CASHIER}, {@code SECRETARY}, {@code GESTIONNAIRE}, {@code ADMIN}, {@code SUPER_ADMIN}
 *       (ou permission {@code ROLE_CASH_REGISTER_SALE}).</li>
 *   <li>Peuvent ouvrir/clôturer la session : {@code CASHIER}, {@code GESTIONNAIRE}, {@code ADMIN}, {@code SUPER_ADMIN}
 *       (ou permission {@code ROLE_CASH_REGISTER_MANAGE}).</li>
 * </ul>
 */
@Service
@Transactional
public class CashSalesRegisterService implements CashSalesRegisterPort {

    private final CashSalesRegisterSessionRepository sessionRepository;
    private final CashSalesRegisterEntryRepository entryRepository;
    private final UserService userService;

    public CashSalesRegisterService(CashSalesRegisterSessionRepository sessionRepository,
                                    CashSalesRegisterEntryRepository entryRepository,
                                    UserService userService) {
        this.sessionRepository = sessionRepository;
        this.entryRepository = entryRepository;
        this.userService = userService;
    }

    public CashSalesRegisterSession openSession(double openingFloat) {
        User user = requireCanManage();
        if (openingFloat < 0) {
            throw new CustomValidationException("Le fond de caisse ne peut pas être négatif.");
        }
        Optional<CashSalesRegisterSession> active = sessionRepository
                .findFirstByStatusOrderByOpenedAtDesc(CashSalesRegisterStatus.OPEN);
        if (active.isPresent()) {
            throw new CustomValidationException("Une session de caisse ventes comptant est déjà ouverte (#"
                    + active.get().getId() + ").");
        }
        return createOpenSession(user.getUsername(), openingFloat, LocalDate.now(ZoneOffset.UTC));
    }

    public CashSalesRegisterSession closeSession(Long sessionId, Double countedClosing, String closingNotes) {
        User user = requireCanManage();
        CashSalesRegisterSession session = (sessionId != null
                ? sessionRepository.findById(sessionId)
                : sessionRepository.findFirstByStatusOrderByOpenedAtDesc(CashSalesRegisterStatus.OPEN))
                .orElseThrow(() -> new CustomValidationException("Aucune session de caisse à clôturer."));
        if (session.getStatus() == CashSalesRegisterStatus.CLOSED) {
            throw new CustomValidationException("Cette session de caisse est déjà clôturée.");
        }
        session.refreshExpected();
        double counted = countedClosing != null ? countedClosing : session.getExpectedClosing();
        session.setCountedClosing(counted);
        session.setDiscrepancy(counted - session.getExpectedClosing());
        session.setClosingNotes(closingNotes);
        session.setStatus(CashSalesRegisterStatus.CLOSED);
        session.setClosedAt(LocalDateTime.now(ZoneOffset.UTC));
        session.setClosedBy(user.getUsername());
        return sessionRepository.save(session);
    }

    @Transactional(readOnly = true)
    public Optional<CashSalesRegisterSession> getCurrentOpenSession() {
        return sessionRepository.findFirstByStatusOrderByOpenedAtDesc(CashSalesRegisterStatus.OPEN);
    }

    @Override
    public void recordCashSaleReceipt(Long saleId, String saleReference, double amount, Long clientId,
                                      String clientName, String collector, String performedBy,
                                      LocalDate accountingDate) {
        if (amount <= 0) {
            return;
        }
        LocalDate date = accountingDate != null ? accountingDate : LocalDate.now(ZoneOffset.UTC);
        String actor = resolveActor(performedBy, collector);
        CashSalesRegisterSession session = getOrAutoOpenSession(actor, date);
        session.addReceipt(amount);
        sessionRepository.save(session);
        saveEntry(session.getId(), CashSalesRegisterEntryType.RECEIPT, amount, amount, saleId, saleReference,
                clientId, clientName, collector, actor, date, "Encaissement vente comptant " + saleReference);
    }

    @Override
    public void recordCashSaleReversal(Long saleId, String saleReference, double amount, Long clientId,
                                       String clientName, String collector, String performedBy,
                                       LocalDate accountingDate) {
        if (amount <= 0) {
            return;
        }
        LocalDate date = accountingDate != null ? accountingDate : LocalDate.now(ZoneOffset.UTC);
        String actor = resolveActor(performedBy, collector);
        CashSalesRegisterSession session = getOrAutoOpenSession(actor, date);
        session.addReversal(amount);
        sessionRepository.save(session);
        saveEntry(session.getId(), CashSalesRegisterEntryType.REVERSAL, amount, -amount, saleId, saleReference,
                clientId, clientName, collector, actor, date, "Annulation vente comptant " + saleReference);
    }

    @Transactional(readOnly = true)
    public CashSalesRegisterSummaryDto getReport(LocalDate startDate, LocalDate endDate) {
        LocalDate from = startDate != null ? startDate : LocalDate.now(ZoneOffset.UTC);
        LocalDate to = endDate != null ? endDate : from;
        if (to.isBefore(from)) {
            throw new CustomValidationException("La plage de dates du rapport de caisse est invalide.");
        }
        List<CashSalesRegisterSession> sessions = sessionRepository
                .findBySessionDateBetweenOrderBySessionDateDescOpenedAtDesc(from, to);
        List<CashSalesRegisterEntry> entries = entryRepository
                .findByAccountingDateBetweenOrderByOccurredAtDescIdDesc(from, to);
        int openCount = (int) sessions.stream()
                .filter(s -> s.getStatus() == CashSalesRegisterStatus.OPEN).count();
        double openingFloat = sessions.stream()
                .mapToDouble(s -> s.getOpeningFloat() != null ? s.getOpeningFloat() : 0.0).sum();
        double totalDiscrepancy = sessions.stream()
                .mapToDouble(s -> s.getDiscrepancy() != null ? s.getDiscrepancy() : 0.0).sum();
        int receiptsCount = 0;
        int reversalsCount = 0;
        double receipts = 0.0;
        double reversals = 0.0;
        for (CashSalesRegisterEntry entry : entries) {
            double amt = entry.getAmount() != null ? entry.getAmount() : 0.0;
            if (entry.getEntryType() == CashSalesRegisterEntryType.RECEIPT) {
                receiptsCount++;
                receipts += amt;
            } else {
                reversalsCount++;
                reversals += amt;
            }
        }
        return new CashSalesRegisterSummaryDto(from, to, sessions.size(), openCount, receiptsCount, reversalsCount,
                openingFloat, receipts, reversals, receipts - reversals, totalDiscrepancy, sessions, entries);
    }

    /** Vérifie qu'un utilisateur connecté a le droit de vendre en caisse (caissier, secrétaire, gestionnaire, admins). */
    public static boolean canSellAtCashRegister(User user) {
        if (user == null) {
            return false;
        }
        return user.is(UserProfilConstant.CASHIER)
                || user.is(UserProfilConstant.SECRETARY)
                || user.is(UserProfilConstant.GESTIONNAIRE)
                || user.is(UserProfilConstant.ADMIN)
                || user.is(UserProfilConstant.SU)
                || hasPermission(user, UserPermissionConstant.CASH_REGISTER_SALE);
    }

    /** Vérifie qu'un utilisateur connecté a le droit d'ouvrir/clôturer une session de caisse. */
    public static boolean canManageCashRegister(User user) {
        if (user == null) {
            return false;
        }
        return user.is(UserProfilConstant.CASHIER)
                || user.is(UserProfilConstant.GESTIONNAIRE)
                || user.is(UserProfilConstant.ADMIN)
                || user.is(UserProfilConstant.SU)
                || hasPermission(user, UserPermissionConstant.CASH_REGISTER_MANAGE);
    }

    private User requireCanManage() {
        User user = userService.getCurrentUser();
        if (!canManageCashRegister(user)) {
            throw new CustomValidationException(
                    "L'ouverture et la clôture de la caisse sont réservées au caissier, au gestionnaire et aux administrateurs.");
        }
        return user;
    }

    private CashSalesRegisterSession getOrAutoOpenSession(String actor, LocalDate date) {
        return sessionRepository.findFirstByStatusOrderByOpenedAtDesc(CashSalesRegisterStatus.OPEN)
                .orElseGet(() -> createOpenSession(actor, 0.0, date));
    }

    private CashSalesRegisterSession createOpenSession(String cashier, double openingFloat, LocalDate date) {
        CashSalesRegisterSession session = new CashSalesRegisterSession();
        session.setSessionDate(date);
        session.setCashierUsername(cashier);
        session.setStatus(CashSalesRegisterStatus.OPEN);
        session.setOpeningFloat(openingFloat);
        session.setOpenedAt(LocalDateTime.now(ZoneOffset.UTC));
        session.refreshExpected();
        return sessionRepository.save(session);
    }

    private void saveEntry(Long sessionId, CashSalesRegisterEntryType type, double amount, double signed,
                           Long saleId, String saleRef, Long clientId, String clientName, String collector,
                           String performedBy, LocalDate accountingDate, String notes) {
        CashSalesRegisterEntry entry = new CashSalesRegisterEntry();
        entry.setSessionId(sessionId);
        entry.setEntryType(type);
        entry.setAmount(amount);
        entry.setSignedAmount(signed);
        entry.setSaleId(saleId);
        entry.setSaleReference(saleRef);
        entry.setClientId(clientId);
        entry.setClientName(clientName);
        entry.setCollector(collector);
        entry.setPerformedBy(performedBy);
        entry.setAccountingDate(accountingDate);
        entry.setOccurredAt(LocalDateTime.now(ZoneOffset.UTC));
        entry.setNotes(notes);
        entryRepository.save(entry);
    }

    private String resolveActor(String performedBy, String fallbackCollector) {
        if (performedBy != null && !performedBy.isBlank()) {
            return performedBy;
        }
        try {
            User current = userService.getCurrentUser();
            if (current != null && current.getUsername() != null) {
                return current.getUsername();
            }
        } catch (RuntimeException ignored) {
        }
        return fallbackCollector != null && !fallbackCollector.isBlank() ? fallbackCollector : "cash-desk";
    }

    private static boolean hasPermission(User user, String permission) {
        return user.getPermissions() != null
                && user.getPermissions().stream().anyMatch(p -> permission.equals(p.getName()));
    }
}
