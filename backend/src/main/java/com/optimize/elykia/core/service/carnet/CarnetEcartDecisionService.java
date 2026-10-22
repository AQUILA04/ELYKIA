package com.optimize.elykia.core.service.carnet;

import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.carnet.CarnetEcartBulkResultDto;
import com.optimize.elykia.core.dto.carnet.CarnetEcartItemDto;
import com.optimize.elykia.core.dto.carnet.CarnetEcartMonthDto;
import com.optimize.elykia.core.dto.carnet.CarnetEcartOutcomeDto;
import com.optimize.elykia.core.entity.carnet.CarnetEcartDecision;
import com.optimize.elykia.core.entity.debt.DebtDocument;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControl;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControlLine;
import com.optimize.elykia.core.enumaration.CarnetEcartDirection;
import com.optimize.elykia.core.enumaration.CarnetEcartDomain;
import com.optimize.elykia.core.enumaration.CarnetEcartStatus;
import com.optimize.elykia.core.repository.CarnetEcartDecisionRepository;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.TontineMemberFieldControlRepository;
import com.optimize.elykia.core.service.debt.DebtService;
import com.optimize.elykia.core.service.sale.CreditTimelineService;
import com.optimize.elykia.core.service.sale.CreditTimelineService.FieldControlCreditPosting;
import com.optimize.elykia.core.service.tontine.TontineService;
import com.optimize.elykia.core.service.tontine.TontineService.FieldControlTontinePosting;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CarnetEcartDecisionService {

    public static final int BULK_LIMIT = 200;

    private final CarnetEcartDecisionRepository decisionRepository;
    private final CreditFieldControlRepository creditFieldControlRepository;
    private final TontineMemberFieldControlRepository tontineFieldControlRepository;
    private final CreditTimelineService creditTimelineService;
    private final TontineService tontineService;
    private final DebtService debtService;
    private final UserService userService;
    private final PlatformTransactionManager transactionManager;

    @Transactional(readOnly = true)
    public List<CarnetEcartItemDto> list(String queue, CarnetEcartDomain domain, String commercial) {
        User user = currentUser();
        assertCanAccess(user);
        String scoped = scopeCommercial(user, commercial);
        List<CarnetEcartItemDto> items = new ArrayList<>();
        if (domain == null || domain == CarnetEcartDomain.CREDIT) {
            items.addAll(listCredits(scoped));
        }
        if (domain == null || domain == CarnetEcartDomain.TONTINE) {
            items.addAll(listTontines(scoped));
        }
        String normalizedQueue = queue == null ? "PENDING" : queue.trim().toUpperCase();
        List<CarnetEcartItemDto> filtered = items.stream()
                .filter(item -> matchesQueue(item, normalizedQueue))
                .sorted(Comparator.comparing(CarnetEcartItemDto::getObservedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
        if (filtered.size() > 1000) {
            return filtered.subList(0, 1000);
        }
        return filtered;
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public CarnetEcartBulkResultDto accept(List<String> keys) {
        return runBulk(keys, true, null);
    }

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public CarnetEcartBulkResultDto reject(List<String> keys, String note) {
        if (!StringUtils.hasText(note)) {
            throw new CustomValidationException("Un motif est obligatoire pour rejeter un écart.");
        }
        return runBulk(keys, false, note.trim());
    }

    private CarnetEcartBulkResultDto runBulk(List<String> keys, boolean accept, String note) {
        if (keys == null || keys.isEmpty()) {
            throw new CustomValidationException("Sélectionnez au moins un écart.");
        }
        if (keys.size() > BULK_LIMIT) {
            throw new CustomValidationException("Le traitement en lot est limité à " + BULK_LIMIT + " écarts.");
        }
        currentUser();
        CarnetEcartBulkResultDto result = new CarnetEcartBulkResultDto();
        TransactionTemplate template = newTransaction();
        for (String rawKey : keys) {
            String key = rawKey == null ? "" : rawKey.trim();
            try {
                CarnetEcartOutcomeDto outcome = template.execute(status ->
                        accept ? acceptOne(key) : rejectOne(key, note));
                if (outcome != null && outcome.getMessage() != null
                        && outcome.getMessage().startsWith("IGNORÉ")) {
                    result.getIgnored().add(outcome);
                } else if (outcome != null) {
                    result.getSucceeded().add(outcome);
                }
            } catch (RuntimeException ex) {
                result.getErrors().add(CarnetEcartOutcomeDto.builder()
                        .key(key)
                        .message(rootMessage(ex))
                        .build());
            }
        }
        return result;
    }

    private CarnetEcartOutcomeDto acceptOne(String key) {
        ParsedKey parsed = parse(key);
        assertCanAccess(currentUser());
        if (parsed.domain == CarnetEcartDomain.CREDIT) {
            return acceptCredit(parsed.controlId);
        }
        return acceptTontine(parsed.controlId, parsed.commercial);
    }

    private CarnetEcartOutcomeDto rejectOne(String key, String note) {
        ParsedKey parsed = parse(key);
        assertCanAccess(currentUser());
        if (parsed.domain == CarnetEcartDomain.CREDIT) {
            return rejectCredit(parsed.controlId, note);
        }
        return rejectTontine(parsed.controlId, parsed.commercial, note);
    }

    private CarnetEcartOutcomeDto acceptCredit(Long controlId) {
        CreditFieldControl control = loadLatestCredit(controlId);
        String commercial = control.getCredit() != null ? control.getCredit().getCollector() : null;
        assertCommercialKnown(commercial);
        assertCanDecide(currentUser(), commercial);
        CarnetEcartDecision existing = decisionRepository.findByCreditFieldControlId(controlId).orElse(null);
        if (existing != null && existing.getStatus() == CarnetEcartStatus.ACCEPTED) {
            return success(creditKey(controlId), "Déjà accepté", existing.getDifferenceAmount());
        }
        if (existing != null) {
            throw new CustomValidationException("Cet écart a déjà été rejeté.");
        }
        double difference = safe(control.getDifferenceAmount());
        if (!CarnetEcartRules.isPositive(difference)) {
            return ignored(creditKey(controlId),
                    "IGNORÉ — le carnet n'est pas supérieur au système. Vous pouvez rejeter cet écart.");
        }
        String reference = "FC-CREDIT-" + controlId;
        FieldControlCreditPosting posting = creditTimelineService.postFieldControlRecovery(
                control.getCredit().getId(), difference, reference);
        CarnetEcartDecision decision = baseDecision(
                CarnetEcartDomain.CREDIT,
                commercial,
                safe(control.getSystemTotalAmountPaid()),
                safe(control.getNotebookTotalAmount()),
                difference,
                CarnetEcartDirection.NOTEBOOK_ABOVE_SYSTEM,
                CarnetEcartStatus.ACCEPTED,
                null);
        decision.setCreditFieldControlId(controlId);
        decision.setMiseReference(posting.reference());
        decision.setOperationDate(LocalDate.now());
        decision = decisionRepository.save(decision);
        if (!posting.alreadyExisted()) {
            DebtDocument debt = debtService.createFieldControlShortage(
                    commercial,
                    LocalDate.now(),
                    posting.cash(),
                    "CREDIT",
                    decision.getId(),
                    "Manquant carnet vente " + nullToEmpty(posting.creditReference()));
            decision.setDebtDocumentId(debt.getId());
            decisionRepository.save(decision);
            creditTimelineService.publishFieldControlCash(posting);
        }
        return success(creditKey(controlId), "Mise et manquant enregistrés", posting.cash());
    }

    private CarnetEcartOutcomeDto rejectCredit(Long controlId, String note) {
        CreditFieldControl control = loadLatestCredit(controlId);
        String commercial = control.getCredit() != null ? control.getCredit().getCollector() : null;
        assertCommercialKnown(commercial);
        assertCanDecide(currentUser(), commercial);
        CarnetEcartDecision existing = decisionRepository.findByCreditFieldControlId(controlId).orElse(null);
        if (existing != null && existing.getStatus() == CarnetEcartStatus.REJECTED) {
            return success(creditKey(controlId), "Déjà rejeté", existing.getDifferenceAmount());
        }
        if (existing != null) {
            throw new CustomValidationException("Cet écart a déjà été accepté.");
        }
        double difference = safe(control.getDifferenceAmount());
        if (!CarnetEcartRules.isMaterial(difference)) {
            throw new CustomValidationException("Cet écart n'est pas à traiter.");
        }
        CarnetEcartDecision decision = baseDecision(
                CarnetEcartDomain.CREDIT,
                commercial,
                safe(control.getSystemTotalAmountPaid()),
                safe(control.getNotebookTotalAmount()),
                difference,
                difference > 0 ? CarnetEcartDirection.NOTEBOOK_ABOVE_SYSTEM
                        : CarnetEcartDirection.SYSTEM_ABOVE_NOTEBOOK,
                CarnetEcartStatus.REJECTED,
                note);
        decision.setCreditFieldControlId(controlId);
        decisionRepository.save(decision);
        return success(creditKey(controlId), "Écart rejeté", difference);
    }

    private CarnetEcartOutcomeDto acceptTontine(Long controlId, String commercial) {
        TontineMemberFieldControl control = loadLatestTontine(controlId);
        List<TontineMemberFieldControlLine> lines = linesFor(control, commercial);
        if (!StringUtils.hasText(commercial)) {
            throw new CustomValidationException(
                    "Le commercial de ces lignes n'est pas identifié. L'écart ne peut pas être accepté.");
        }
        assertCanDecide(currentUser(), commercial);
        List<TontineMemberFieldControlLine> positive = new ArrayList<>();
        boolean already = false;
        for (TontineMemberFieldControlLine line : lines) {
            double difference = safe(line.getDifferenceAmount());
            CarnetEcartDecision existing = decisionRepository.findByTontineLineId(line.getId()).orElse(null);
            if (existing != null) {
                if (existing.getStatus() == CarnetEcartStatus.ACCEPTED) {
                    already = true;
                }
                continue;
            }
            if (CarnetEcartRules.isPositive(difference)) {
                positive.add(line);
            }
        }
        if (positive.isEmpty()) {
            boolean inverseLeft = lines.stream().anyMatch(line ->
                    CarnetEcartRules.isNegative(safe(line.getDifferenceAmount()))
                            && decisionRepository.findByTontineLineId(line.getId()).isEmpty());
            if (inverseLeft) {
                return ignored(tontineKey(controlId, commercial),
                        "IGNORÉ — le carnet n'est pas supérieur au système. Vous pouvez rejeter cet écart.");
            }
            if (already) {
                return success(tontineKey(controlId, commercial), "Déjà accepté", null);
            }
            throw new CustomValidationException("Aucune ligne à accepter pour ce commercial.");
        }
        double cash = 0d;
        Long memberId = control.getTontineMember().getId();
        for (TontineMemberFieldControlLine line : positive) {
            LocalDate operationDate = CarnetEcartRules.tontineOperationDate(
                    line.getYear(), line.getMonth(), LocalDate.now());
            String reference = "FC-TONTINE-" + line.getId();
            double difference = safe(line.getDifferenceAmount());
            FieldControlTontinePosting posting = tontineService.recordFieldControlCollection(
                    memberId, difference, operationDate, commercial, reference);
            CarnetEcartDecision decision = baseDecision(
                    CarnetEcartDomain.TONTINE,
                    commercial,
                    safe(line.getSystemAmount()),
                    safe(line.getNotebookAmount()),
                    difference,
                    CarnetEcartDirection.NOTEBOOK_ABOVE_SYSTEM,
                    CarnetEcartStatus.ACCEPTED,
                    null);
            decision.setTontineFieldControlId(controlId);
            decision.setTontineLineId(line.getId());
            decision.setMiseReference(posting.reference());
            decision.setOperationDate(posting.operationDate());
            decision = decisionRepository.save(decision);
            if (!posting.alreadyExisted()) {
                DebtDocument debt = debtService.createFieldControlShortage(
                        commercial,
                        posting.operationDate(),
                        posting.amount(),
                        "TONTINE",
                        decision.getId(),
                        "Manquant carnet tontine " + line.getMonth() + "/" + line.getYear());
                decision.setDebtDocumentId(debt.getId());
                decisionRepository.save(decision);
                tontineService.publishFieldControlCollection(posting);
            }
            cash += posting.amount();
        }
        return success(tontineKey(controlId, commercial), "Mises et manquants enregistrés", cash);
    }

    private CarnetEcartOutcomeDto rejectTontine(Long controlId, String commercial, String note) {
        TontineMemberFieldControl control = loadLatestTontine(controlId);
        List<TontineMemberFieldControlLine> lines = linesFor(control, commercial);
        if (StringUtils.hasText(commercial)) {
            assertCanDecide(currentUser(), commercial);
        } else if (!canManageAll(currentUser())) {
            throw new CustomValidationException("Le commercial de ces lignes n'est pas identifié.");
        }
        int rejected = 0;
        for (TontineMemberFieldControlLine line : lines) {
            double difference = safe(line.getDifferenceAmount());
            if (!CarnetEcartRules.isMaterial(difference)) {
                continue;
            }
            CarnetEcartDecision existing = decisionRepository.findByTontineLineId(line.getId()).orElse(null);
            if (existing != null) {
                continue;
            }
            String lineCommercial = StringUtils.hasText(line.getCommercialUsername())
                    ? line.getCommercialUsername().trim()
                    : "";
            CarnetEcartDecision decision = baseDecision(
                    CarnetEcartDomain.TONTINE,
                    StringUtils.hasText(lineCommercial) ? lineCommercial : "inconnu",
                    safe(line.getSystemAmount()),
                    safe(line.getNotebookAmount()),
                    difference,
                    difference > 0 ? CarnetEcartDirection.NOTEBOOK_ABOVE_SYSTEM
                            : CarnetEcartDirection.SYSTEM_ABOVE_NOTEBOOK,
                    CarnetEcartStatus.REJECTED,
                    note);
            decision.setTontineFieldControlId(controlId);
            decision.setTontineLineId(line.getId());
            decisionRepository.save(decision);
            rejected++;
        }
        if (rejected == 0) {
            return success(tontineKey(controlId, commercial), "Déjà traité", null);
        }
        return success(tontineKey(controlId, commercial), "Écart rejeté", null);
    }

    private List<CarnetEcartItemDto> listCredits(String commercial) {
        List<CreditFieldControl> controls = dedupeCredits(
                creditFieldControlRepository.findLatestEcarts(blankToNull(commercial)));
        if (controls.isEmpty()) {
            return List.of();
        }
        Map<Long, CarnetEcartDecision> decisions = new HashMap<>();
        decisionRepository.findByCreditFieldControlIdIn(controls.stream().map(CreditFieldControl::getId).toList())
                .forEach(decision -> decisions.put(decision.getCreditFieldControlId(), decision));
        List<CarnetEcartItemDto> items = new ArrayList<>();
        for (CreditFieldControl control : controls) {
            double difference = safe(control.getDifferenceAmount());
            if (!CarnetEcartRules.isMaterial(difference)) {
                continue;
            }
            Credit credit = control.getCredit();
            String collector = credit != null ? credit.getCollector() : null;
            CarnetEcartDecision decision = decisions.get(control.getId());
            CarnetEcartStatus status = decision != null ? decision.getStatus() : CarnetEcartStatus.PENDING;
            boolean positive = CarnetEcartRules.isPositive(difference);
            double acceptable = status == CarnetEcartStatus.PENDING && positive ? difference : 0d;
            double inverse = status == CarnetEcartStatus.PENDING && !positive ? Math.abs(difference) : 0d;
            String clientName = credit != null && credit.getClient() != null
                    ? credit.getClient().getFullName() : null;
            items.add(CarnetEcartItemDto.builder()
                    .key(creditKey(control.getId()))
                    .domain(CarnetEcartDomain.CREDIT)
                    .controlId(control.getId())
                    .commercialUsername(collector)
                    .clientName(clientName)
                    .subjectReference(credit != null ? credit.getReference() : null)
                    .observedAt(control.getObservedAt())
                    .systemAmount(safe(control.getSystemTotalAmountPaid()))
                    .notebookAmount(safe(control.getNotebookTotalAmount()))
                    .differenceAmount(difference)
                    .direction(positive
                            ? CarnetEcartDirection.NOTEBOOK_ABOVE_SYSTEM
                            : CarnetEcartDirection.SYSTEM_ABOVE_NOTEBOOK)
                    .status(status)
                    .acceptableAmount(acceptable)
                    .pendingInverseAmount(inverse)
                    .commercialKnown(StringUtils.hasText(collector))
                    .months(List.of())
                    .build());
        }
        return items;
    }

    private List<CarnetEcartItemDto> listTontines(String commercial) {
        List<TontineMemberFieldControl> controls = dedupeTontines(tontineFieldControlRepository.findLatestEcarts());
        List<Long> lineIds = controls.stream()
                .flatMap(control -> control.getLines().stream())
                .map(TontineMemberFieldControlLine::getId)
                .filter(Objects::nonNull)
                .toList();
        Map<Long, CarnetEcartDecision> decisions = new HashMap<>();
        if (!lineIds.isEmpty()) {
            decisionRepository.findByTontineLineIdIn(lineIds)
                    .forEach(decision -> decisions.put(decision.getTontineLineId(), decision));
        }
        List<CarnetEcartItemDto> items = new ArrayList<>();
        for (TontineMemberFieldControl control : controls) {
            Map<String, List<TontineMemberFieldControlLine>> byCommercial = new LinkedHashMap<>();
            for (TontineMemberFieldControlLine line : control.getLines()) {
                if (!CarnetEcartRules.isMaterial(safe(line.getDifferenceAmount()))) {
                    continue;
                }
                String key = line.getCommercialUsername() == null ? "" : line.getCommercialUsername().trim();
                byCommercial.computeIfAbsent(key, ignored -> new ArrayList<>()).add(line);
            }
            TontineMember member = control.getTontineMember();
            String clientName = member != null && member.getClient() != null
                    ? member.getClient().getFullName() : null;
            for (Map.Entry<String, List<TontineMemberFieldControlLine>> entry : byCommercial.entrySet()) {
                if (commercial != null && !entry.getKey().equalsIgnoreCase(commercial)) {
                    continue;
                }
                items.add(toTontineItem(control, entry.getKey(), entry.getValue(), decisions, clientName));
            }
        }
        return items;
    }

    private CarnetEcartItemDto toTontineItem(
            TontineMemberFieldControl control,
            String commercial,
            List<TontineMemberFieldControlLine> lines,
            Map<Long, CarnetEcartDecision> decisions,
            String clientName) {
        double system = 0d;
        double notebook = 0d;
        double acceptable = 0d;
        double inverse = 0d;
        boolean anyAccepted = false;
        boolean anyRejected = false;
        List<CarnetEcartMonthDto> months = new ArrayList<>();
        for (TontineMemberFieldControlLine line : lines) {
            double difference = safe(line.getDifferenceAmount());
            system += safe(line.getSystemAmount());
            notebook += safe(line.getNotebookAmount());
            CarnetEcartDecision decision = decisions.get(line.getId());
            CarnetEcartStatus lineStatus = decision != null ? decision.getStatus() : CarnetEcartStatus.PENDING;
            if (lineStatus == CarnetEcartStatus.PENDING && CarnetEcartRules.isPositive(difference)) {
                acceptable += difference;
            } else if (lineStatus == CarnetEcartStatus.PENDING && CarnetEcartRules.isNegative(difference)) {
                inverse += Math.abs(difference);
            } else if (lineStatus == CarnetEcartStatus.ACCEPTED) {
                anyAccepted = true;
            } else if (lineStatus == CarnetEcartStatus.REJECTED) {
                anyRejected = true;
            }
            months.add(CarnetEcartMonthDto.builder()
                    .lineId(line.getId())
                    .year(line.getYear())
                    .month(line.getMonth())
                    .systemAmount(safe(line.getSystemAmount()))
                    .notebookAmount(safe(line.getNotebookAmount()))
                    .differenceAmount(difference)
                    .status(lineStatus)
                    .build());
        }
        CarnetEcartStatus status;
        CarnetEcartDirection direction;
        if (acceptable > 0d && inverse > 0d) {
            status = CarnetEcartStatus.PENDING;
            direction = CarnetEcartDirection.MIXED;
        } else if (acceptable > 0d) {
            status = CarnetEcartStatus.PENDING;
            direction = CarnetEcartDirection.NOTEBOOK_ABOVE_SYSTEM;
        } else if (inverse > 0d) {
            status = CarnetEcartStatus.PENDING;
            direction = CarnetEcartDirection.SYSTEM_ABOVE_NOTEBOOK;
        } else if (anyAccepted) {
            status = CarnetEcartStatus.ACCEPTED;
            direction = CarnetEcartDirection.NOTEBOOK_ABOVE_SYSTEM;
        } else if (anyRejected) {
            status = CarnetEcartStatus.REJECTED;
            direction = CarnetEcartDirection.SYSTEM_ABOVE_NOTEBOOK;
        } else {
            status = CarnetEcartStatus.PENDING;
            direction = CarnetEcartDirection.NOTEBOOK_ABOVE_SYSTEM;
        }
        return CarnetEcartItemDto.builder()
                .key(tontineKey(control.getId(), commercial))
                .domain(CarnetEcartDomain.TONTINE)
                .controlId(control.getId())
                .commercialUsername(StringUtils.hasText(commercial) ? commercial : null)
                .clientName(clientName)
                .subjectReference(control.getTontineMember() != null
                        ? "Membre " + control.getTontineMember().getId() : null)
                .observedAt(control.getObservedAt())
                .systemAmount(system)
                .notebookAmount(notebook)
                .differenceAmount(notebook - system)
                .direction(direction)
                .status(status)
                .acceptableAmount(acceptable)
                .pendingInverseAmount(inverse)
                .commercialKnown(StringUtils.hasText(commercial))
                .months(months)
                .build();
    }

    private CreditFieldControl loadLatestCredit(Long controlId) {
        CreditFieldControl control = creditFieldControlRepository.findById(controlId)
                .orElseThrow(() -> new ResourceNotFoundException("credit.field.control.not.found"));
        Long creditId = control.getCredit() != null ? control.getCredit().getId() : null;
        CreditFieldControl latest = creditFieldControlRepository
                .findFirstByCredit_idAndStateOrderByObservedAtDesc(
                        creditId, com.optimize.common.entities.enums.State.ENABLED)
                .orElse(control);
        if (!Objects.equals(latest.getId(), control.getId())) {
            throw new CustomValidationException("Un contrôle plus récent existe pour cette vente.");
        }
        return control;
    }

    private TontineMemberFieldControl loadLatestTontine(Long controlId) {
        TontineMemberFieldControl control = tontineFieldControlRepository.findById(controlId)
                .orElseThrow(() -> new ResourceNotFoundException("tontine.member.field.control.not.found"));
        Long memberId = control.getTontineMember() != null ? control.getTontineMember().getId() : null;
        TontineMemberFieldControl latest = tontineFieldControlRepository
                .findFirstByTontineMember_idAndStateOrderByObservedAtDesc(
                        memberId, com.optimize.common.entities.enums.State.ENABLED)
                .orElse(control);
        if (!Objects.equals(latest.getId(), control.getId())) {
            throw new CustomValidationException("Un contrôle plus récent existe pour ce membre.");
        }
        if (control.getLines() == null || control.getLines().isEmpty()) {
            control = tontineFieldControlRepository.findById(controlId).orElse(control);
        }
        return control;
    }

    private List<TontineMemberFieldControlLine> linesFor(TontineMemberFieldControl control, String commercial) {
        String expected = commercial == null ? "" : commercial;
        return control.getLines().stream()
                .filter(line -> {
                    String lineCommercial = line.getCommercialUsername() == null
                            ? "" : line.getCommercialUsername().trim();
                    return lineCommercial.equalsIgnoreCase(expected);
                })
                .toList();
    }

    private CarnetEcartDecision baseDecision(
            CarnetEcartDomain domain,
            String commercial,
            double system,
            double notebook,
            double difference,
            CarnetEcartDirection direction,
            CarnetEcartStatus status,
            String note) {
        CarnetEcartDecision decision = new CarnetEcartDecision();
        decision.setDomain(domain);
        decision.setCommercialUsername(commercial.trim());
        decision.setSystemAmount(system);
        decision.setNotebookAmount(notebook);
        decision.setDifferenceAmount(difference);
        decision.setDirection(direction);
        decision.setStatus(status);
        decision.setRejectionNote(note);
        decision.setDecidedBy(currentUser().getUsername());
        decision.setDecidedAt(LocalDateTime.now());
        return decision;
    }

    private static boolean matchesQueue(CarnetEcartItemDto item, String queue) {
        return switch (queue) {
            case "ALL" -> true;
            case "INVERSE" -> item.getStatus() == CarnetEcartStatus.PENDING
                    && item.getAcceptableAmount() <= 0d
                    && item.getPendingInverseAmount() > 0d;
            case "ACCEPTED" -> item.getStatus() == CarnetEcartStatus.ACCEPTED;
            case "REJECTED" -> item.getStatus() == CarnetEcartStatus.REJECTED;
            default -> item.getStatus() == CarnetEcartStatus.PENDING && item.getAcceptableAmount() > 0d;
        };
    }

    private List<CreditFieldControl> dedupeCredits(List<CreditFieldControl> controls) {
        Map<Long, CreditFieldControl> byCredit = new HashMap<>();
        for (CreditFieldControl control : controls) {
            if (control.getCredit() == null || control.getCredit().getId() == null) {
                continue;
            }
            byCredit.merge(control.getCredit().getId(), control, (left, right) ->
                    left.getId() >= right.getId() ? left : right);
        }
        return new ArrayList<>(byCredit.values());
    }

    private List<TontineMemberFieldControl> dedupeTontines(List<TontineMemberFieldControl> controls) {
        Map<Long, TontineMemberFieldControl> byMember = new HashMap<>();
        for (TontineMemberFieldControl control : controls) {
            if (control.getTontineMember() == null || control.getTontineMember().getId() == null) {
                continue;
            }
            byMember.merge(control.getTontineMember().getId(), control, (left, right) ->
                    left.getId() >= right.getId() ? left : right);
        }
        return new ArrayList<>(byMember.values());
    }

    private void assertCommercialKnown(String commercial) {
        if (!StringUtils.hasText(commercial)) {
            throw new CustomValidationException("Le commercial de cette vente n'est pas identifié.");
        }
    }

    private void assertCanAccess(User user) {
        if (canManageAll(user) || user.is(UserProfilConstant.PROMOTER)) {
            return;
        }
        throw new CustomValidationException(
                "Accès réservé au commercial, au gestionnaire ou à l'administrateur.");
    }

    private void assertCanDecide(User user, String commercial) {
        if (canManageAll(user)) {
            return;
        }
        if (user.is(UserProfilConstant.PROMOTER)
                && user.getUsername() != null
                && user.getUsername().equalsIgnoreCase(commercial)) {
            return;
        }
        throw new CustomValidationException("Vous ne pouvez traiter que vos propres écarts.");
    }

    private boolean canManageAll(User user) {
        return user.is(UserProfilConstant.ADMIN)
                || user.is(UserProfilConstant.GESTIONNAIRE)
                || user.is(UserProfilConstant.SU);
    }

    private String scopeCommercial(User user, String requested) {
        if (!canManageAll(user)) {
            return user.getUsername();
        }
        return blankToNull(requested);
    }

    private User currentUser() {
        User user = userService.getCurrentUser();
        if (user == null) {
            throw new CustomValidationException("Utilisateur non authentifié.");
        }
        return user;
    }

    private TransactionTemplate newTransaction() {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return template;
    }

    private static ParsedKey parse(String key) {
        if (!StringUtils.hasText(key)) {
            throw new CustomValidationException("Clé d'écart manquante.");
        }
        if (key.startsWith("CREDIT|")) {
            return new ParsedKey(CarnetEcartDomain.CREDIT, Long.parseLong(key.substring("CREDIT|".length())), null);
        }
        if (key.startsWith("TONTINE|")) {
            String rest = key.substring("TONTINE|".length());
            int separator = rest.indexOf('|');
            if (separator < 0) {
                throw new CustomValidationException("Clé d'écart tontine invalide.");
            }
            long controlId = Long.parseLong(rest.substring(0, separator));
            return new ParsedKey(CarnetEcartDomain.TONTINE, controlId, rest.substring(separator + 1));
        }
        throw new CustomValidationException("Clé d'écart invalide.");
    }

    private static String creditKey(Long controlId) {
        return "CREDIT|" + controlId;
    }

    private static String tontineKey(Long controlId, String commercial) {
        return "TONTINE|" + controlId + "|" + (commercial == null ? "" : commercial);
    }

    private static CarnetEcartOutcomeDto success(String key, String message, Double amount) {
        return CarnetEcartOutcomeDto.builder().key(key).message(message).amount(amount).build();
    }

    private static CarnetEcartOutcomeDto ignored(String key, String message) {
        return CarnetEcartOutcomeDto.builder().key(key).message(message).build();
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static double safe(Double value) {
        return value == null ? 0d : value;
    }

    private static String rootMessage(Throwable error) {
        Throwable root = error;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        String message = root.getMessage();
        return StringUtils.hasText(message) ? message : "Le traitement de cet écart a échoué.";
    }

    private record ParsedKey(CarnetEcartDomain domain, Long controlId, String commercial) {
    }
}
