package com.optimize.elykia.core.service.customer;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.customer.WithdrawalFeeBracketDto;
import com.optimize.elykia.core.entity.customer.MobileMoneyWithdrawalFeeBracket;
import com.optimize.elykia.core.repository.customer.MobileMoneyWithdrawalFeeBracketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class WithdrawalFeeBracketService {

    static final String MIXX = "MIXX";
    static final String FLOOZ = "FLOOZ";

    private final MobileMoneyWithdrawalFeeBracketRepository repository;

    @Transactional(readOnly = true)
    public List<WithdrawalFeeBracketDto> list() {
        return repository.findByStateOrderByNetworkAscMinAmountAsc(State.ENABLED).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<Long> feeFor(String network, long amount) {
        String normalized = normalizeNetwork(network);
        return repository.findFee(normalized, State.ENABLED, amount)
                .map(MobileMoneyWithdrawalFeeBracket::getFeeAmount);
    }

    public WithdrawalFeeBracketDto create(WithdrawalFeeBracketDto request) {
        MobileMoneyWithdrawalFeeBracket bracket = new MobileMoneyWithdrawalFeeBracket();
        apply(bracket, request, null);
        return toDto(repository.save(bracket));
    }

    public WithdrawalFeeBracketDto update(Long id, WithdrawalFeeBracketDto request) {
        MobileMoneyWithdrawalFeeBracket bracket = requireEnabled(id);
        apply(bracket, request, id);
        return toDto(repository.save(bracket));
    }

    public void delete(Long id) {
        MobileMoneyWithdrawalFeeBracket bracket = requireEnabled(id);
        bracket.setState(State.DELETED);
        repository.save(bracket);
    }

    private void apply(MobileMoneyWithdrawalFeeBracket bracket, WithdrawalFeeBracketDto request, Long selfId) {
        String network = normalizeNetwork(request.getNetwork());
        long min = request.getMinAmount();
        long max = request.getMaxAmount();
        long fee = request.getFeeAmount();
        if (min >= max) {
            throw new CustomValidationException("Le montant minimum doit être inférieur au montant maximum.");
        }
        if (fee < 0) {
            throw new CustomValidationException("Les frais de retrait ne peuvent pas être négatifs.");
        }
        assertNoOverlap(network, min, max, selfId);
        bracket.setNetwork(network);
        bracket.setMinAmount(min);
        bracket.setMaxAmount(max);
        bracket.setFeeAmount(fee);
    }

    private void assertNoOverlap(String network, long min, long max, Long selfId) {
        for (MobileMoneyWithdrawalFeeBracket existing : repository.findByNetworkAndStateOrderByMinAmountAsc(network, State.ENABLED)) {
            if (selfId != null && selfId.equals(existing.getId())) {
                continue;
            }
            boolean overlaps = min <= existing.getMaxAmount() && max >= existing.getMinAmount();
            if (overlaps) {
                throw new CustomValidationException("Cette tranche chevauche une tranche déjà enregistrée pour ce réseau.");
            }
        }
    }

    private MobileMoneyWithdrawalFeeBracket requireEnabled(Long id) {
        MobileMoneyWithdrawalFeeBracket bracket = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tranche de frais introuvable."));
        if (bracket.getState() != State.ENABLED) {
            throw new ResourceNotFoundException("Tranche de frais introuvable.");
        }
        return bracket;
    }

    static String normalizeNetwork(String network) {
        if (network == null) {
            throw new CustomValidationException("Le réseau est obligatoire.");
        }
        String normalized = network.trim().toUpperCase(Locale.ROOT);
        if (!MIXX.equals(normalized) && !FLOOZ.equals(normalized)) {
            throw new CustomValidationException("Réseau inconnu. Choisissez Mixx by Yas ou Flooz.");
        }
        return normalized;
    }

    private WithdrawalFeeBracketDto toDto(MobileMoneyWithdrawalFeeBracket bracket) {
        WithdrawalFeeBracketDto dto = new WithdrawalFeeBracketDto();
        dto.setId(bracket.getId());
        dto.setNetwork(bracket.getNetwork());
        dto.setMinAmount(bracket.getMinAmount());
        dto.setMaxAmount(bracket.getMaxAmount());
        dto.setFeeAmount(bracket.getFeeAmount());
        return dto;
    }
}
