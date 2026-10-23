package com.optimize.elykia.core.service;

import com.optimize.elykia.core.dto.CreditLateDTO;
import com.optimize.elykia.core.dto.CreditLateSummaryDTO;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;
import com.optimize.elykia.core.enumaration.LateType;
import com.optimize.elykia.core.repository.ClientReliquatRepository;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.service.carnet.CarnetEcartRecontrolPolicy;
import com.optimize.elykia.core.service.carnet.CarnetEcartRecontrolPolicy.EcartDecisionView;
import com.optimize.elykia.core.util.ClientReliquatNetRemaining;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import com.itextpdf.html2pdf.HtmlConverter;
import java.io.ByteArrayOutputStream;

@Service
@RequiredArgsConstructor
public class CreditLateService {

    private final CreditRepository creditRepository;
    private final ClientReliquatRepository clientReliquatRepository;
    private final CreditFieldControlRepository creditFieldControlRepository;
    private final CarnetEcartRecontrolPolicy recontrolPolicy;
    private final TemplateEngine templateEngine;

    public List<CreditLateDTO> getLateCredits(String collector, Integer month, String locality) {
        List<Credit> credits;
        if (collector != null && !collector.isBlank()) {
            credits = creditRepository.findLateCreditsByCollector(collector);
        } else {
            credits = creditRepository.findLateCredits();
        }

        LocalDate today = LocalDate.now();
        int currentYear = today.getYear();

        List<CreditLateDTO> lates = credits.stream()
                .filter(c -> {
                    if (month == null)
                        return true;
                    if (c.getExpectedEndDate() == null)
                        return false;
                    return c.getExpectedEndDate().getMonthValue() == month
                            && c.getExpectedEndDate().getYear() == currentYear;
                })
                .filter(c -> {
                    if (locality != null && !locality.isBlank()) {
                        if (c.getClient() == null || c.getClient().getQuarter() == null) return false;
                        return c.getClient().getQuarter().equalsIgnoreCase(locality);
                    }
                    return true;
                })
                .map(c -> buildLateDTO(c, today))
                .filter(dto -> dto.getLateType() != null)
                .collect(Collectors.toCollection(ArrayList::new));

        applyClientReliquatDeduction(lates);

        lates.sort(Comparator
                .comparing((CreditLateDTO d) -> d.getLateType() == LateType.DELAI ? 0 : 1)
                .thenComparing(d -> -Math.max(d.getLateDaysDelai(), d.getLateDaysEcheance())));

        return lates;
    }

    /**
     * Paginated late credits for the online field list. {@code totalElements} is the full match count, not the page size.
     */
    @Transactional(readOnly = true)
    public Page<CreditLateDTO> getLateCreditsPage(String search, int page, int size) {
        String folded = foldSearch(search);
        String digits = folded.replaceAll("\\D", "");
        int safeSize = Math.min(Math.max(size, 1), 40);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<Credit> credits = creditRepository.searchLateCredits(folded, digits, pageable);
        LocalDate today = LocalDate.now();
        List<CreditLateDTO> dtos = credits.getContent().stream()
                .map(credit -> buildLateDTO(credit, today))
                .collect(Collectors.toCollection(ArrayList::new));
        applyClientReliquatDeduction(dtos);
        return new PageImpl<>(dtos, pageable, credits.getTotalElements());
    }

    /**
     * In-progress credits of one collector, including those that are not late.
     * Late fields stay empty when the credit is up to date.
     */
    @Transactional(readOnly = true)
    public List<CreditLateDTO> getInProgressCredits(String collector) {
        if (collector == null || collector.isBlank()) {
            return List.of();
        }
        LocalDate today = LocalDate.now();
        List<CreditLateDTO> credits = creditRepository.findInProgressCreditsByCollector(collector).stream()
                .map(credit -> buildLateDTO(credit, today))
                .collect(Collectors.toCollection(ArrayList::new));
        applyClientReliquatDeduction(credits);
        credits.sort(Comparator
                .comparing((CreditLateDTO dto) -> dto.getClientName() == null ? "" : dto.getClientName(),
                        String.CASE_INSENSITIVE_ORDER)
                .thenComparing(dto -> dto.getId() == null ? 0L : dto.getId()));
        return credits;
    }

    /**
     * Paginated in-progress credits for the online field list. Late fields are filled only when the credit is late.
     */
    @Transactional(readOnly = true)
    public Page<CreditLateDTO> getInProgressCreditsPage(String search, int page, int size) {
        String folded = foldSearch(search);
        String digits = folded.replaceAll("\\D", "");
        int safeSize = Math.min(Math.max(size, 1), 40);
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, safeSize);
        Page<Credit> credits = creditRepository.searchInProgressCredits(folded, digits, pageable);
        LocalDate today = LocalDate.now();
        List<CreditLateDTO> dtos = credits.getContent().stream()
                .map(credit -> buildLateDTO(credit, today))
                .collect(Collectors.toCollection(ArrayList::new));
        applyClientReliquatDeduction(dtos);
        attachLatestControls(dtos);
        return new PageImpl<>(dtos, pageable, credits.getTotalElements());
    }

    private static String foldSearch(String search) {
        if (search == null) {
            return "";
        }
        String folded = Normalizer.normalize(search, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(java.util.Locale.ROOT)
                .trim();
        return folded;
    }

    public CreditLateSummaryDTO getSummary(String collector, Integer month, String locality) {
        List<CreditLateDTO> lates = getLateCredits(collector, month, locality);

        long totalLate = lates.size();
        long totalDelai = lates.stream().filter(d -> d.getLateType() == LateType.DELAI).count();
        long totalEcheance = lates.stream().filter(d -> d.getLateType() == LateType.ECHEANCE).count();
        double totalDu = lates.stream().mapToDouble(CreditLateDTO::getTotalAmountRemaining).sum();
        double totalDelaiAmount = lates.stream()
                .filter(d -> d.getLateType() == LateType.DELAI)
                .mapToDouble(d -> d.getTotalAmountRemaining() != null ? d.getTotalAmountRemaining() : 0.0)
                .sum();

        return CreditLateSummaryDTO.builder()
                .totalLate(totalLate)
                .totalDelai(totalDelai)
                .totalEcheance(totalEcheance)
                .totalAmountRemaining(totalDu)
                .totalAmountRemainingDelai(totalDelaiAmount)
                .build();
    }

    public List<String> getLateCollectors() {
        return creditRepository.findLateCreditsCollectors();
    }

    public byte[] generatePdfExport(String collector, Integer month, String lateType, String locality) {
        List<CreditLateDTO> credits = getLateCredits(collector, month, locality);

        if (lateType != null && !lateType.equals("all")) {
            LateType typeEnum = LateType.valueOf(lateType);
            credits = credits.stream()
                    .filter(c -> c.getLateType() == typeEnum)
                    .collect(Collectors.toList());
        }

        long totalAmountRemaining = credits.stream()
                .mapToLong(c -> c.getTotalAmountRemaining() != null ? c.getTotalAmountRemaining().longValue() : 0L)
                .sum();
                
        Map<String, List<CreditLateDTO>> creditsByQuarter = credits.stream()
                .collect(Collectors.groupingBy(
                        c -> c.getClientQuarter() != null && !c.getClientQuarter().isBlank() ? c.getClientQuarter() : "Non spécifié",
                        TreeMap::new,
                        Collectors.toList()
                ));

        Context context = new Context();
        context.setVariable("creditsByQuarter", creditsByQuarter);
        context.setVariable("creditsEmpty", credits.isEmpty());
        context.setVariable("collectorName", collector != null && !collector.isBlank() ? collector : "Tous");
        context.setVariable("month",
                month != null ? String.format("%02d/%d", month, LocalDate.now().getYear()) : "Tous");
        context.setVariable("generationDate",
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        context.setVariable("totalAmountRemaining", totalAmountRemaining);
        context.setVariable("lateType", lateType != null && lateType.equals("DELAI") ? "Retard délai"
                : (lateType != null && lateType.equals("ECHEANCE") ? "Retard échéance" : "Tous"));

        String html = templateEngine.process("credit-late-export", context);

        ByteArrayOutputStream target = new ByteArrayOutputStream();
        HtmlConverter.convertToPdf(html, target);
        return target.toByteArray();
    }

    /**
     * Déduit le reliquat client du montant restant affiché (liste / KPI / PDF / clôture).
     * Si un client a plusieurs crédits en retard, le reliquat est réparti sans double comptage.
     */
    private void applyClientReliquatDeduction(List<CreditLateDTO> lates) {
        Set<Long> clientIds = lates.stream()
                .map(CreditLateDTO::getClientId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, Double> remainingReliquat = ClientReliquatNetRemaining.loadAvailableByClient(
                clientReliquatRepository, clientIds);

        for (int i = 0; i < lates.size(); i++) {
            CreditLateDTO dto = lates.get(i);
            double remaining = dto.getTotalAmountRemaining() != null ? dto.getTotalAmountRemaining() : 0.0;
            double applied = ClientReliquatNetRemaining.consume(remainingReliquat, dto.getClientId(), remaining);
            if (applied <= 0) {
                continue;
            }
            lates.set(i, dto.toBuilder()
                    .totalAmountRemaining(remaining - applied)
                    .clientReliquatApplied(applied)
                    .build());
        }
    }

    private void attachLatestControls(List<CreditLateDTO> rows) {
        List<Long> ids = rows.stream().map(CreditLateDTO::getId).filter(Objects::nonNull).toList();
        if (ids.isEmpty()) {
            return;
        }
        List<CreditFieldControl> latest = dedupeLatestCredit(
                creditFieldControlRepository.findLatestByCreditIds(ids));
        Map<Long, EcartDecisionView> views = recontrolPolicy.viewCredits(latest);
        Map<Long, CreditFieldControl> byCredit = new HashMap<>();
        for (CreditFieldControl control : latest) {
            Long creditId = control.getCredit() != null ? control.getCredit().getId() : null;
            if (creditId != null) {
                byCredit.put(creditId, control);
            }
        }
        for (int i = 0; i < rows.size(); i++) {
            CreditLateDTO row = rows.get(i);
            CreditFieldControl control = row.getId() != null ? byCredit.get(row.getId()) : null;
            if (control == null) {
                continue;
            }
            EcartDecisionView view = control.getId() != null
                    ? views.getOrDefault(control.getId(), EcartDecisionView.none())
                    : EcartDecisionView.none();
            rows.set(i, row.toBuilder()
                    .latestControlStatus(control.getStatus() != null ? control.getStatus().name() : null)
                    .latestDifferenceAmount(control.getDifferenceAmount())
                    .latestNotebookTotalAmount(control.getNotebookTotalAmount())
                    .latestControlNote(control.getNote())
                    .latestObservedAt(control.getObservedAt())
                    .ecartDecisionStatus(view.status())
                    .modifiable(view.modifiable())
                    .build());
        }
    }

    private List<CreditFieldControl> dedupeLatestCredit(List<CreditFieldControl> controls) {
        Map<Long, CreditFieldControl> best = new LinkedHashMap<>();
        if (controls == null) {
            return List.of();
        }
        for (CreditFieldControl control : controls) {
            Long creditId = control.getCredit() != null ? control.getCredit().getId() : null;
            if (creditId == null) {
                continue;
            }
            CreditFieldControl current = best.get(creditId);
            if (current == null || isNewerControl(control, current)) {
                best.put(creditId, control);
            }
        }
        return new ArrayList<>(best.values());
    }

    private static boolean isNewerControl(CreditFieldControl candidate, CreditFieldControl current) {
        LocalDateTime candidateAt = candidate.getObservedAt();
        LocalDateTime currentAt = current.getObservedAt();
        if (candidateAt == null) {
            return false;
        }
        if (currentAt == null) {
            return true;
        }
        int compared = candidateAt.compareTo(currentAt);
        if (compared != 0) {
            return compared > 0;
        }
        long left = candidate.getId() != null ? candidate.getId() : 0L;
        long right = current.getId() != null ? current.getId() : 0L;
        return left > right;
    }

    private CreditLateDTO buildLateDTO(Credit credit, LocalDate today) {
        int lateDaysDelai = 0;
        boolean isLateDelai = false;

        if (credit.getExpectedEndDate() != null && today.isAfter(credit.getExpectedEndDate())) {
            lateDaysDelai = (int) ChronoUnit.DAYS.between(credit.getExpectedEndDate(), today);
            isLateDelai = true;
        }

        int lateDaysEcheance = 0;
        boolean isLateEcheance = false;

        if (credit.getBeginDate() != null && credit.getDailyStake() != null && credit.getDailyStake() > 0) {
            long totalDuration = credit.getExpectedEndDate() != null
                    ? ChronoUnit.DAYS.between(credit.getBeginDate(), credit.getExpectedEndDate())
                    : Long.MAX_VALUE;

            long rawElapsed = ChronoUnit.DAYS.between(credit.getBeginDate(), today);
            long elapsedDays = Math.min(rawElapsed, totalDuration);

            long paidDays = (long) Math.floor(
                    (credit.getTotalAmountPaid() != null ? credit.getTotalAmountPaid() : 0.0) / credit.getDailyStake());
            long lateEcheance = Math.max(0L, elapsedDays - paidDays);

            if (lateEcheance > 0) {
                lateDaysEcheance = (int) lateEcheance;
                isLateEcheance = true;
            }
        }

        LateType lateType = null;
        if (isLateDelai) {
            lateType = LateType.DELAI;
        } else if (isLateEcheance) {
            lateType = LateType.ECHEANCE;
        }

        return CreditLateDTO.builder()
                .id(credit.getId())
                .reference(credit.getReference())
                .clientId(credit.getClient() != null ? credit.getClient().getId() : null)
                .clientName(credit.getClient() != null
                        ? credit.getClient().getLastname() + " " + credit.getClient().getFirstname()
                        : "—")
                .clientPhone(credit.getClient() != null ? credit.getClient().getPhone() : null)
                .clientQuarter(credit.getClient() != null ? credit.getClient().getQuarter() : null)
                .latitude(credit.getClient() != null ? credit.getClient().getLatitude() : null)
                .longitude(credit.getClient() != null ? credit.getClient().getLongitude() : null)
                .mll(credit.getClient() != null ? credit.getClient().getMll() : null)
                .collector(credit.getCollector())
                .totalAmount(credit.getTotalAmount())
                .totalAmountPaid(credit.getTotalAmountPaid())
                .totalAmountRemaining(credit.getTotalAmountRemaining())
                .clientReliquatApplied(0.0)
                .dailyStake(credit.getDailyStake())
                .beginDate(credit.getBeginDate())
                .expectedEndDate(credit.getExpectedEndDate())
                .remainingDaysCount(credit.getRemainingDaysCount())
                .lateDaysDelai(lateDaysDelai)
                .lateDaysEcheance(lateDaysEcheance)
                .lateType(lateType)
                .status(credit.getStatus())
                .carnetVerified(Boolean.TRUE.equals(credit.getCarnetVerified()))
                .carnetVerifiedAt(credit.getCarnetVerifiedAt())
                .carnetVerifiedBy(credit.getCarnetVerifiedBy())
                .build();
    }
}
