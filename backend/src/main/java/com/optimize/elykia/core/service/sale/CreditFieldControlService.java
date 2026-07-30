package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.CreateCreditFieldControlDto;
import com.optimize.elykia.core.dto.CreditFieldControlDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CreditFieldControlService {

    private static final double EPSILON = 0.0001d;

    private final CreditFieldControlRepository repository;
    private final CreditRepository creditRepository;

    @Transactional
    public CreditFieldControlDto create(Long creditId, CreateCreditFieldControlDto dto) {
        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> new ResourceNotFoundException("credit.not.found"));

        double systemAmountPaid = credit.getTotalAmountPaid() != null ? credit.getTotalAmountPaid() : 0d;
        double notebookAmount = dto.getNotebookTotalAmount() != null ? dto.getNotebookTotalAmount() : 0d;
        double differenceAmount = notebookAmount - systemAmountPaid;

        CreditFieldControl entity = new CreditFieldControl();
        entity.setCredit(credit);
        entity.setNotebookTotalAmount(notebookAmount);
        entity.setSystemTotalAmountPaid(systemAmountPaid);
        entity.setDifferenceAmount(differenceAmount);
        entity.setStatus(Math.abs(differenceAmount) < EPSILON ? FieldControlStatus.CONFORME : FieldControlStatus.ECART);
        entity.setObservedAt(dto.getObservedAt() != null ? dto.getObservedAt() : LocalDateTime.now());
        entity.setObservedBy(SecurityContextHolder.getContext().getAuthentication().getName());
        entity.setNote(dto.getNote());

        return toDto(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public CreditFieldControlDto getLatest(Long creditId) {
        CreditFieldControl latest = repository.findFirstByCredit_idAndStateOrderByObservedAtDesc(creditId, State.ENABLED)
                .orElseThrow(() -> new ResourceNotFoundException("credit.field.control.not.found"));
        return toDto(latest);
    }

    @Transactional(readOnly = true)
    public List<CreditFieldControlDto> getHistory(Long creditId) {
        return repository.findByCredit_idAndStateOrderByObservedAtDesc(creditId, State.ENABLED).stream()
                .map(this::toDto)
                .toList();
    }

    private CreditFieldControlDto toDto(CreditFieldControl entity) {
        return CreditFieldControlDto.builder()
                .id(entity.getId())
                .creditId(entity.getCredit() != null ? entity.getCredit().getId() : null)
                .notebookTotalAmount(entity.getNotebookTotalAmount())
                .systemTotalAmountPaid(entity.getSystemTotalAmountPaid())
                .differenceAmount(entity.getDifferenceAmount())
                .status(entity.getStatus())
                .observedAt(entity.getObservedAt())
                .observedBy(entity.getObservedBy())
                .note(entity.getNote())
                .build();
    }
}
