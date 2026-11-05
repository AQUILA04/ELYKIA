package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.CreateCreditFieldControlDto;
import com.optimize.elykia.core.dto.CreditFieldControlDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditFieldControl;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.event.CarnetEcartDetectedEvent;
import com.optimize.elykia.core.repository.CreditFieldControlRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.service.carnet.CarnetEcartRecontrolPolicy;
import com.optimize.elykia.core.service.carnet.CarnetEcartRecontrolPolicy.EcartDecisionView;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CreditFieldControlService {

    private static final double EPSILON = 0.0001d;

    private final CreditFieldControlRepository repository;
    private final CreditRepository creditRepository;
    private final CarnetEcartRecontrolPolicy recontrolPolicy;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public CreditFieldControlDto create(Long creditId, CreateCreditFieldControlDto dto) {
        String reference = dto.getReference() != null ? dto.getReference().trim() : null;
        if (StringUtils.hasText(reference) && repository.existsByReference(reference)) {
            return toDto(repository.findByReference(reference).orElseThrow());
        }

        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> new ResourceNotFoundException("credit.not.found"));

        double systemAmountPaid = credit.getTotalAmountPaid() != null ? credit.getTotalAmountPaid() : 0d;
        double notebookAmount = dto.getNotebookTotalAmount() != null ? dto.getNotebookTotalAmount() : 0d;
        double differenceAmount = notebookAmount - systemAmountPaid;
        FieldControlStatus status = Math.abs(differenceAmount) < EPSILON
                ? FieldControlStatus.CONFORME
                : FieldControlStatus.ECART;
        LocalDateTime observedAt = dto.getObservedAt() != null ? dto.getObservedAt() : LocalDateTime.now();
        String observedBy = SecurityContextHolder.getContext().getAuthentication().getName();

        CreditFieldControl latest = findLatest(creditId).orElse(null);
        if (latest != null && recontrolPolicy != null && recontrolPolicy.mustModifyCredit(latest)) {
            latest.setReference(reference);
            latest.setNotebookTotalAmount(notebookAmount);
            latest.setSystemTotalAmountPaid(systemAmountPaid);
            latest.setDifferenceAmount(differenceAmount);
            latest.setStatus(status);
            latest.setObservedAt(observedAt);
            latest.setObservedBy(observedBy);
            latest.setNote(dto.getNote());
            CreditFieldControl saved = repository.save(latest);
            publishEcart(saved, credit, differenceAmount);
            return toDto(saved);
        }

        CreditFieldControl entity = new CreditFieldControl();
        entity.setCredit(credit);
        entity.setReference(reference);
        entity.setNotebookTotalAmount(notebookAmount);
        entity.setSystemTotalAmountPaid(systemAmountPaid);
        entity.setDifferenceAmount(differenceAmount);
        entity.setStatus(status);
        entity.setObservedAt(observedAt);
        entity.setObservedBy(observedBy);
        entity.setNote(dto.getNote());

        CreditFieldControl saved = repository.save(entity);
        publishEcart(saved, credit, differenceAmount);
        return toDto(saved);
    }

    private void publishEcart(CreditFieldControl saved, Credit credit, double differenceAmount) {
        if (saved.getStatus() != FieldControlStatus.ECART || !StringUtils.hasText(credit.getCollector())) {
            return;
        }
        String clientName = credit.getClient() != null ? credit.getClient().getFullName() : null;
        eventPublisher.publishEvent(new CarnetEcartDetectedEvent(List.of(
                new CarnetEcartDetectedEvent.Item(
                        credit.getCollector(),
                        clientName,
                        saved.getId(),
                        "CREDIT:" + credit.getCollector(),
                        Math.max(0d, differenceAmount)))));
    }

    private Optional<CreditFieldControl> findLatest(Long creditId) {
        Optional<CreditFieldControl> found = repository
                .findFirstByCredit_idAndStateOrderByObservedAtDesc(creditId, State.ENABLED);
        return found != null ? found : Optional.empty();
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
        EcartDecisionView view = decisionView(entity);
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
                .ecartDecisionStatus(view.status())
                .modifiable(view.modifiable())
                .build();
    }

    private EcartDecisionView decisionView(CreditFieldControl entity) {
        if (recontrolPolicy == null || entity == null || entity.getId() == null) {
            return EcartDecisionView.none();
        }
        EcartDecisionView view = recontrolPolicy.viewCredit(entity);
        return view != null ? view : EcartDecisionView.none();
    }
}
