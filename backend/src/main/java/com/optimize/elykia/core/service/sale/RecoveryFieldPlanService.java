package com.optimize.elykia.core.service.sale;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.CreditFieldControlDto;
import com.optimize.elykia.core.dto.CreditLateDTO;
import com.optimize.elykia.core.dto.sale.*;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;
import com.optimize.elykia.core.entity.sale.RecoveryFieldDayPlan;
import com.optimize.elykia.core.enumaration.FieldDayPlanStatus;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.RecoveryFieldDayPlanRepository;
import com.optimize.elykia.core.service.CreditLateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
@Slf4j
@RequiredArgsConstructor
public class RecoveryFieldPlanService {

    private static final int MAX_COMMERCIALS = 3;
    private static final long BYTES_PER_LATE_CREDIT_ESTIMATE = 8_000L;

    private final RecoveryFieldDayPlanRepository planRepository;
    private final CreditLateService creditLateService;
    private final CreditRepository creditRepository;
    private final CreditFieldControlRepository creditFieldControlRepository;
    private final ClientService clientService;
    private final ObjectMapper objectMapper;

    public FieldDayPlanDto createOrReplacePlan(FieldDayPlanRequestDto request, String recoveryManagerUsername) {
        validateRequest(request);

        LocalDate planDate = request.getPlanDate();
        planRepository.findByRecoveryManagerUsernameAndPlanDateAndStatus(
                recoveryManagerUsername, planDate, FieldDayPlanStatus.ACTIVE
        ).ifPresent(existing -> {
            existing.setStatus(FieldDayPlanStatus.CLOSED);
            planRepository.save(existing);
        });

        RecoveryFieldDayPlan plan = new RecoveryFieldDayPlan();
        plan.setRecoveryManagerUsername(recoveryManagerUsername);
        plan.setPlanDate(planDate);
        plan.setStatus(FieldDayPlanStatus.ACTIVE);
        plan.setCommercialUsernamesJson(toJson(normalizeUsernames(request.getCommercialUsernames())));
        plan.setQuartersJson(toJson(normalizeQuarters(request.getQuarters())));

        return toDto(planRepository.save(plan));
    }

    @Transactional(readOnly = true)
    public Optional<FieldDayPlanDto> getTodayPlan(String recoveryManagerUsername) {
        return planRepository.findByRecoveryManagerUsernameAndPlanDateAndStatus(
                recoveryManagerUsername, LocalDate.now(), FieldDayPlanStatus.ACTIVE
        ).map(this::toDto);
    }

    public FieldDayPlanDto updatePlan(Long planId, FieldDayPlanRequestDto request, String recoveryManagerUsername) {
        validateRequest(request);
        RecoveryFieldDayPlan plan = planRepository.findByIdAndRecoveryManagerUsername(planId, recoveryManagerUsername)
                .orElseThrow(() -> new ApplicationException("Plan terrain introuvable"));
        if (plan.getStatus() != FieldDayPlanStatus.ACTIVE) {
            throw new ApplicationException("Seul un plan ACTIVE peut être modifié");
        }
        if (!plan.getPlanDate().equals(LocalDate.now())) {
            throw new ApplicationException("Modification autorisée uniquement pour le plan du jour");
        }

        plan.setCommercialUsernamesJson(toJson(normalizeUsernames(request.getCommercialUsernames())));
        plan.setQuartersJson(toJson(normalizeQuarters(request.getQuarters())));
        return toDto(planRepository.save(plan));
    }

    public FieldDayPlanDto closePlan(Long planId, String recoveryManagerUsername) {
        RecoveryFieldDayPlan plan = planRepository.findByIdAndRecoveryManagerUsername(planId, recoveryManagerUsername)
                .orElseThrow(() -> new ApplicationException("Plan terrain introuvable"));
        plan.setStatus(FieldDayPlanStatus.CLOSED);
        return toDto(planRepository.save(plan));
    }

    public RmPackClientDto updateClientContact(Long clientId, RmClientContactUpdateDto dto, String recoveryManagerUsername) {
        FieldDayPlanDto plan = getTodayPlan(recoveryManagerUsername)
                .orElseThrow(() -> new ApplicationException("Aucun plan terrain ACTIVE pour aujourd'hui"));

        Client client = clientService.getById(clientId);
        assertClientInActivePlan(client, plan);

        boolean hasPhone = StringUtils.hasText(dto.getPhone());
        boolean hasGeo = dto.getLatitude() != null || dto.getLongitude() != null || StringUtils.hasText(dto.getMll());
        if (!hasPhone && !hasGeo) {
            throw new ApplicationException("Fournissez au moins le téléphone ou la géolocalisation");
        }
        if ((dto.getLatitude() == null) != (dto.getLongitude() == null)) {
            throw new ApplicationException("Latitude et longitude doivent être fournies ensemble");
        }

        clientService.updatePhoneAndGeo(
                clientId,
                dto.getPhone(),
                dto.getLatitude(),
                dto.getLongitude(),
                dto.getMll()
        );
        Client updated = clientService.getById(clientId);
        return RmPackClientDto.builder()
                .id(updated.getId())
                .firstname(updated.getFirstname())
                .lastname(updated.getLastname())
                .fullName(updated.getFullName())
                .phone(updated.getPhone())
                .quarter(updated.getQuarter())
                .collector(updated.getCollector())
                .latitude(updated.getLatitude())
                .longitude(updated.getLongitude())
                .mll(updated.getMll())
                .build();
    }

    private void assertClientInActivePlan(Client client, FieldDayPlanDto plan) {
        List<String> commercials = plan.getCommercialUsernames() != null ? plan.getCommercialUsernames() : List.of();
        String collector = client.getCollector();
        boolean collectorOk = StringUtils.hasText(collector)
                && commercials.stream().anyMatch(c -> c.equalsIgnoreCase(collector.trim()));
        if (!collectorOk) {
            throw new ApplicationException("Client hors périmètre du plan (commercial)");
        }

        List<String> quarters = plan.getQuarters() != null ? plan.getQuarters() : List.of();
        if (!quarters.isEmpty()) {
            String clientQuarter = client.getQuarter();
            boolean quarterOk = StringUtils.hasText(clientQuarter)
                    && quarters.stream().anyMatch(q -> q.equalsIgnoreCase(clientQuarter.trim()));
            if (!quarterOk) {
                throw new ApplicationException("Client hors périmètre du plan (quartier)");
            }
        }
    }

    @Transactional(readOnly = true)
    public List<RmCollectorStatDto> getCollectorStats() {
        List<String> collectors = creditLateService.getLateCollectors();
        List<RmCollectorStatDto> stats = new ArrayList<>();
        for (String username : collectors) {
            if (!StringUtils.hasText(username)) {
                continue;
            }
            List<CreditLateDTO> lates = creditLateService.getLateCredits(username, null, null);
            List<String> quarters = lates.stream()
                    .map(CreditLateDTO::getClientQuarter)
                    .filter(StringUtils::hasText)
                    .map(q -> q.trim())
                    .distinct()
                    .sorted(String.CASE_INSENSITIVE_ORDER)
                    .collect(Collectors.toList());
            double total = lates.stream()
                    .mapToDouble(d -> d.getTotalAmountRemaining() != null ? d.getTotalAmountRemaining() : 0.0)
                    .sum();
            stats.add(RmCollectorStatDto.builder()
                    .username(username)
                    .lateCount(lates.size())
                    .totalAmountRemaining(total)
                    .quarters(quarters)
                    .build());
        }
        stats.sort(Comparator.comparingLong(RmCollectorStatDto::getLateCount).reversed());
        return stats;
    }

    @Transactional(readOnly = true)
    public RmOfflinePackDto buildOfflinePack(Long planId, String recoveryManagerUsername, boolean includeTontine) {
        RecoveryFieldDayPlan plan = planRepository.findByIdAndRecoveryManagerUsername(planId, recoveryManagerUsername)
                .orElseThrow(() -> new ApplicationException("Plan terrain introuvable"));
        if (plan.getStatus() != FieldDayPlanStatus.ACTIVE) {
            throw new ApplicationException("Le pack offline n'est disponible que pour un plan ACTIVE");
        }

        List<String> commercials = fromJson(plan.getCommercialUsernamesJson());
        List<String> quarters = fromJson(plan.getQuartersJson());
        Set<String> quarterFilter = quarters.stream()
                .filter(StringUtils::hasText)
                .map(q -> q.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());

        List<CreditLateDTO> lateCredits = new ArrayList<>();
        for (String commercial : commercials) {
            List<CreditLateDTO> forCommercial = creditLateService.getLateCredits(commercial, null, null);
            if (quarterFilter.isEmpty()) {
                lateCredits.addAll(forCommercial);
            } else {
                forCommercial.stream()
                        .filter(dto -> dto.getClientQuarter() != null
                                && quarterFilter.contains(dto.getClientQuarter().trim().toLowerCase(Locale.ROOT)))
                        .forEach(lateCredits::add);
            }
        }

        Map<Long, RmPackClientDto> clientsById = new LinkedHashMap<>();
        for (CreditLateDTO late : lateCredits) {
            if (late.getClientId() == null || clientsById.containsKey(late.getClientId())) {
                continue;
            }
            clientsById.put(late.getClientId(), loadClientDto(late));
        }

        List<Long> creditIds = lateCredits.stream().map(CreditLateDTO::getId).filter(Objects::nonNull).toList();
        List<CreditFieldControlDto> controlsToday = loadFieldControlsToday(creditIds);

        List<RmCommercialRefDto> commercialRefs = commercials.stream()
                .map(u -> RmCommercialRefDto.builder().username(u).displayName(u).build())
                .toList();

        long estimatedBytes = lateCredits.size() * BYTES_PER_LATE_CREDIT_ESTIMATE
                + clientsById.size() * 2_000L;

        return RmOfflinePackDto.builder()
                .planId(plan.getId())
                .planDate(plan.getPlanDate())
                .generatedAt(Instant.now())
                .stats(RmOfflinePackStatsDto.builder()
                        .lateCredits(lateCredits.size())
                        .clients(clientsById.size())
                        .estimatedBytes(estimatedBytes)
                        .build())
                .commercials(commercialRefs)
                .lateCredits(lateCredits)
                .clients(new ArrayList<>(clientsById.values()))
                .creditFieldControlsToday(controlsToday)
                .tontineMembers(includeTontine ? List.of() : List.of())
                .tontineFieldControlsToday(List.of())
                .build();
    }

    private RmPackClientDto loadClientDto(CreditLateDTO late) {
        Double latitude = null;
        Double longitude = null;
        String mll = null;
        String firstname = null;
        String lastname = null;
        String profilPhotoUrl = null;
        String profilPhotoThumbUrl = null;
        try {
            Optional<Credit> credit = creditRepository.findById(late.getId());
            if (credit.isPresent() && credit.get().getClient() != null) {
                Client client = credit.get().getClient();
                firstname = client.getFirstname();
                lastname = client.getLastname();
                latitude = client.getLatitude();
                longitude = client.getLongitude();
                mll = client.getMll();
                profilPhotoUrl = client.getProfilPhotoUrl();
                profilPhotoThumbUrl = client.getProfilPhotoThumbUrl();
            }
        } catch (Exception e) {
            log.warn("Unable to load geo for client {}: {}", late.getClientId(), e.getMessage());
        }

        String fullName = late.getClientName();
        return RmPackClientDto.builder()
                .id(late.getClientId())
                .firstname(firstname)
                .lastname(lastname)
                .fullName(fullName)
                .phone(late.getClientPhone())
                .quarter(late.getClientQuarter())
                .collector(late.getCollector())
                .latitude(latitude)
                .longitude(longitude)
                .mll(mll)
                .profilPhotoUrl(profilPhotoUrl)
                .profilPhotoThumbUrl(profilPhotoThumbUrl)
                .build();
    }

    private List<CreditFieldControlDto> loadFieldControlsToday(List<Long> creditIds) {
        if (creditIds.isEmpty()) {
            return List.of();
        }
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
        List<CreditFieldControl> controls = creditFieldControlRepository
                .findByCredit_IdInAndObservedAtBetweenAndState(creditIds, start, end, State.ENABLED);
        return controls.stream().map(this::toFieldControlDto).toList();
    }

    private CreditFieldControlDto toFieldControlDto(CreditFieldControl entity) {
        return CreditFieldControlDto.builder()
                .id(entity.getId())
                .creditId(entity.getCredit() != null ? entity.getCredit().getId() : null)
                .reference(entity.getReference())
                .notebookTotalAmount(entity.getNotebookTotalAmount())
                .systemTotalAmountPaid(entity.getSystemTotalAmountPaid())
                .differenceAmount(entity.getDifferenceAmount())
                .status(entity.getStatus())
                .observedAt(entity.getObservedAt())
                .observedBy(entity.getObservedBy())
                .note(entity.getNote())
                .build();
    }

    private void validateRequest(FieldDayPlanRequestDto request) {
        if (request.getCommercialUsernames() == null || request.getCommercialUsernames().isEmpty()) {
            throw new ApplicationException("Au moins un commercial est requis");
        }
        List<String> normalized = normalizeUsernames(request.getCommercialUsernames());
        if (normalized.size() > MAX_COMMERCIALS) {
            throw new ApplicationException("Maximum " + MAX_COMMERCIALS + " commerciaux par plan");
        }
        if (normalized.isEmpty()) {
            throw new ApplicationException("Au moins un commercial est requis");
        }
    }

    private List<String> normalizeUsernames(List<String> usernames) {
        if (usernames == null) {
            return List.of();
        }
        return usernames.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList();
    }

    private List<String> normalizeQuarters(List<String> quarters) {
        if (quarters == null) {
            return List.of();
        }
        return quarters.stream()
                .filter(StringUtils::hasText)
                .map(String::trim)
                .distinct()
                .toList();
    }

    private FieldDayPlanDto toDto(RecoveryFieldDayPlan plan) {
        return FieldDayPlanDto.builder()
                .id(plan.getId())
                .recoveryManagerUsername(plan.getRecoveryManagerUsername())
                .planDate(plan.getPlanDate())
                .status(plan.getStatus())
                .commercialUsernames(fromJson(plan.getCommercialUsernamesJson()))
                .quarters(fromJson(plan.getQuartersJson()))
                .build();
    }

    private String toJson(List<String> values) {
        try {
            return objectMapper.writeValueAsString(values != null ? values : List.of());
        } catch (JsonProcessingException e) {
            throw new ApplicationException("Erreur sérialisation plan terrain");
        }
    }

    private List<String> fromJson(String json) {
        if (!StringUtils.hasText(json)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Invalid plan JSON: {}", e.getMessage());
            return List.of();
        }
    }
}
