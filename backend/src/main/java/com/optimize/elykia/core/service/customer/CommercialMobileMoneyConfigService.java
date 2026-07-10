package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.elykia.core.config.CustomerMobileMoneyProperties;
import com.optimize.elykia.core.dto.customer.CommercialMobileMoneyConfigPageDto;
import com.optimize.elykia.core.dto.customer.CommercialMobileMoneyConfigRowDto;
import com.optimize.elykia.core.dto.customer.CommercialMobileMoneyConfigUpsertDto;
import com.optimize.elykia.core.dto.customer.CustomerMobileMoneyRecipientDto;
import com.optimize.elykia.core.entity.customer.CommercialMobileMoneyConfig;
import com.optimize.elykia.core.repository.customer.CommercialMobileMoneyConfigRepository;
import com.optimize.elykia.core.service.user.UserManagement;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommercialMobileMoneyConfigService {

    private final CommercialMobileMoneyConfigRepository repository;
    private final UserManagement userManagement;
    private final CustomerMobileMoneyProperties globalProperties;

    public CommercialMobileMoneyConfigPageDto listAll() {
        Map<String, CommercialMobileMoneyConfig> byUsername = repository.findAll().stream()
                .collect(Collectors.toMap(CommercialMobileMoneyConfig::getCommercialUsername, c -> c, (a, b) -> a));

        List<CommercialMobileMoneyConfigRowDto> rows = userManagement.getPromoters().stream()
                .sorted(Comparator.comparing(User::getUsername, String.CASE_INSENSITIVE_ORDER))
                .map(user -> toRowDto(user, byUsername.get(user.getUsername())))
                .toList();

        return CommercialMobileMoneyConfigPageDto.builder()
                .globalMixxNumber(blankToNull(globalProperties.getMixxNumber()))
                .globalMoovNumber(blankToNull(globalProperties.getMoovNumber()))
                .commercials(rows)
                .build();
    }

    @Transactional
    public CommercialMobileMoneyConfigRowDto upsert(String commercialUsername, CommercialMobileMoneyConfigUpsertDto dto) {
        User commercial = userManagement.getPromoters().stream()
                .filter(u -> commercialUsername.equalsIgnoreCase(u.getUsername()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("commercial.not.found"));

        CommercialMobileMoneyConfig config = repository.findByCommercialUsername(commercial.getUsername())
                .orElseGet(() -> {
                    CommercialMobileMoneyConfig created = new CommercialMobileMoneyConfig();
                    created.setCommercialUsername(commercial.getUsername());
                    return created;
                });

        config.setMixxNumber(normalizeNumber(dto.getMixxNumber()));
        config.setMoovNumber(normalizeNumber(dto.getMoovNumber()));
        config = repository.save(config);
        return toRowDto(commercial, config);
    }

    public CustomerMobileMoneyRecipientDto resolveForCollector(String collectorUsername) {
        String collector = StringUtils.hasText(collectorUsername) ? collectorUsername.trim() : null;
        String collectorName = resolveCollectorName(collector);
        ResolvedNumbers numbers = resolveNumbers(collector);

        return CustomerMobileMoneyRecipientDto.builder()
                .collector(collector)
                .collectorName(collectorName)
                .mixxNumber(numbers.mixx())
                .moovNumber(numbers.moov())
                .mixxUsesGlobalDefault(numbers.mixxUsesGlobal())
                .moovUsesGlobalDefault(numbers.moovUsesGlobal())
                .build();
    }

    private CommercialMobileMoneyConfigRowDto toRowDto(User user, CommercialMobileMoneyConfig config) {
        ResolvedNumbers numbers = resolveNumbers(user.getUsername(), config);
        return CommercialMobileMoneyConfigRowDto.builder()
                .commercialUsername(user.getUsername())
                .commercialFullName(formatUserName(user))
                .commercialPhone(user.getPhone())
                .mixxNumber(config != null ? blankToNull(config.getMixxNumber()) : null)
                .moovNumber(config != null ? blankToNull(config.getMoovNumber()) : null)
                .effectiveMixxNumber(numbers.mixx())
                .effectiveMoovNumber(numbers.moov())
                .mixxUsesGlobalDefault(numbers.mixxUsesGlobal())
                .moovUsesGlobalDefault(numbers.moovUsesGlobal())
                .build();
    }

    private ResolvedNumbers resolveNumbers(String collectorUsername) {
        CommercialMobileMoneyConfig config = StringUtils.hasText(collectorUsername)
                ? repository.findByCommercialUsername(collectorUsername).orElse(null)
                : null;
        return resolveNumbers(collectorUsername, config);
    }

    private ResolvedNumbers resolveNumbers(String collectorUsername, CommercialMobileMoneyConfig config) {
        String configuredMixx = config != null ? blankToNull(config.getMixxNumber()) : null;
        String configuredMoov = config != null ? blankToNull(config.getMoovNumber()) : null;
        String globalMixx = blankToNull(globalProperties.getMixxNumber());
        String globalMoov = blankToNull(globalProperties.getMoovNumber());

        boolean mixxUsesGlobal = configuredMixx == null;
        boolean moovUsesGlobal = configuredMoov == null;
        String effectiveMixx = mixxUsesGlobal ? globalMixx : configuredMixx;
        String effectiveMoov = moovUsesGlobal ? globalMoov : configuredMoov;

        return new ResolvedNumbers(effectiveMixx, effectiveMoov, mixxUsesGlobal, moovUsesGlobal);
    }

    private String resolveCollectorName(String collectorUsername) {
        if (!StringUtils.hasText(collectorUsername)) {
            return null;
        }
        return userManagement.getPromoters().stream()
                .filter(u -> collectorUsername.equalsIgnoreCase(u.getUsername()))
                .map(this::formatUserName)
                .findFirst()
                .orElse(collectorUsername);
    }

    private String formatUserName(User user) {
        if (user == null) {
            return null;
        }
        String first = user.getFirstname() != null ? user.getFirstname().trim() : "";
        String last = user.getLastname() != null ? user.getLastname().trim() : "";
        String full = (first + " " + last).trim();
        return full.isEmpty() ? user.getUsername() : full;
    }

    private String normalizeNumber(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim().replaceAll("\\s+", "");
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }

    private record ResolvedNumbers(String mixx, String moov, boolean mixxUsesGlobal, boolean moovUsesGlobal) {
    }
}
