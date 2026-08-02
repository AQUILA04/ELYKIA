package com.optimize.elykia.core.service.tontine;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.elykia.core.dto.CreateTontineMemberFieldControlDto;
import com.optimize.elykia.core.dto.CreateTontineMemberFieldControlMonthDto;
import com.optimize.elykia.core.dto.TontineMemberFieldControlDto;
import com.optimize.elykia.core.dto.TontineMemberFieldControlLineDto;
import com.optimize.elykia.core.entity.tontine.TontineCollection;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControl;
import com.optimize.elykia.core.entity.tontine.TontineMemberFieldControlLine;
import com.optimize.elykia.core.enumaration.FieldControlStatus;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberFieldControlRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TontineMemberFieldControlService {

    private static final double EPSILON = 0.0001d;
    /** Mois calendaires de la session tontine : février (2) → novembre (11). */
    private static final Set<Integer> TONTINE_CALENDAR_MONTHS = Set.of(2, 3, 4, 5, 6, 7, 8, 9, 10, 11);

    private final TontineMemberFieldControlRepository repository;
    private final TontineMemberRepository tontineMemberRepository;
    private final TontineCollectionRepository tontineCollectionRepository;

    @Transactional
    public TontineMemberFieldControlDto create(Long memberId, CreateTontineMemberFieldControlDto dto) {
        String reference = dto.getReference() != null ? dto.getReference().trim() : null;
        if (StringUtils.hasText(reference) && repository.existsByReference(reference)) {
            return toDto(repository.findByReference(reference).orElseThrow());
        }

        TontineMember member = tontineMemberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("tontine.member.not.found"));

        if (dto.getMonths() == null || dto.getMonths().isEmpty()) {
            throw new CustomValidationException("Au moins un mois doit être renseigné.");
        }

        Set<String> seen = new HashSet<>();
        for (CreateTontineMemberFieldControlMonthDto monthDto : dto.getMonths()) {
            if (!TONTINE_CALENDAR_MONTHS.contains(monthDto.getMonth())) {
                throw new CustomValidationException(
                        "Le mois " + monthDto.getMonth() + " n'est pas un mois de session tontine (février–novembre).");
            }
            String key = monthDto.getYear() + "-" + monthDto.getMonth();
            if (!seen.add(key)) {
                throw new CustomValidationException("Le mois " + key + " est saisi en double.");
            }
        }

        List<TontineCollection> collections = tontineCollectionRepository
                .findByTontineMember_IdAndStateOrderByCollectionDateAscIdAsc(memberId, State.ENABLED);

        TontineMemberFieldControl entity = new TontineMemberFieldControl();
        entity.setTontineMember(member);
        entity.setReference(reference);
        entity.setObservedAt(dto.getObservedAt() != null ? dto.getObservedAt() : LocalDateTime.now());
        entity.setObservedBy(SecurityContextHolder.getContext().getAuthentication().getName());
        entity.setNote(dto.getNote());

        double notebookTotal = 0d;
        double systemTotal = 0d;

        for (CreateTontineMemberFieldControlMonthDto monthDto : dto.getMonths()) {
            double systemAmount = sumCollectionsForMonth(collections, monthDto.getYear(), monthDto.getMonth());
            double notebookAmount = monthDto.getNotebookAmount() != null ? monthDto.getNotebookAmount() : 0d;
            double difference = notebookAmount - systemAmount;

            TontineMemberFieldControlLine line = new TontineMemberFieldControlLine();
            line.setYear(monthDto.getYear());
            line.setMonth(monthDto.getMonth());
            line.setNotebookAmount(notebookAmount);
            line.setSystemAmount(systemAmount);
            line.setDifferenceAmount(difference);
            entity.addLine(line);

            notebookTotal += notebookAmount;
            systemTotal += systemAmount;
        }

        double differenceTotal = notebookTotal - systemTotal;
        entity.setNotebookTotalAmount(notebookTotal);
        entity.setSystemTotalAmount(systemTotal);
        entity.setDifferenceAmount(differenceTotal);
        entity.setStatus(Math.abs(differenceTotal) < EPSILON ? FieldControlStatus.CONFORME : FieldControlStatus.ECART);

        return toDto(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public TontineMemberFieldControlDto getLatest(Long memberId) {
        TontineMemberFieldControl latest = repository
                .findFirstByTontineMember_idAndStateOrderByObservedAtDesc(memberId, State.ENABLED)
                .orElseThrow(() -> new ResourceNotFoundException("tontine.member.field.control.not.found"));
        return toDto(latest);
    }

    @Transactional(readOnly = true)
    public List<TontineMemberFieldControlDto> getHistory(Long memberId) {
        return repository.findByTontineMember_idAndStateOrderByObservedAtDesc(memberId, State.ENABLED).stream()
                .map(this::toDto)
                .toList();
    }

    private double sumCollectionsForMonth(List<TontineCollection> collections, int year, int month) {
        return collections.stream()
                .filter(c -> c.getCollectionDate() != null
                        && c.getCollectionDate().getYear() == year
                        && c.getCollectionDate().getMonthValue() == month)
                .mapToDouble(c -> c.getAmount() != null ? c.getAmount() : 0d)
                .sum();
    }

    private TontineMemberFieldControlDto toDto(TontineMemberFieldControl entity) {
        List<TontineMemberFieldControlLineDto> lines = entity.getLines() == null
                ? List.of()
                : entity.getLines().stream()
                .map(line -> TontineMemberFieldControlLineDto.builder()
                        .id(line.getId())
                        .year(line.getYear())
                        .month(line.getMonth())
                        .notebookAmount(line.getNotebookAmount())
                        .systemAmount(line.getSystemAmount())
                        .differenceAmount(line.getDifferenceAmount())
                        .build())
                .toList();

        return TontineMemberFieldControlDto.builder()
                .id(entity.getId())
                .tontineMemberId(entity.getTontineMember() != null ? entity.getTontineMember().getId() : null)
                .reference(entity.getReference())
                .notebookTotalAmount(entity.getNotebookTotalAmount())
                .systemTotalAmount(entity.getSystemTotalAmount())
                .differenceAmount(entity.getDifferenceAmount())
                .status(entity.getStatus())
                .observedAt(entity.getObservedAt())
                .observedBy(entity.getObservedBy())
                .note(entity.getNote())
                .lines(lines)
                .build();
    }
}
