package com.optimize.elykia.core.service.commercial;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.commercial.CommercialAccountDto;
import com.optimize.elykia.core.dto.commercial.CommercialAssignmentDto;
import com.optimize.elykia.core.dto.commercial.CommercialAssignmentWriteDto;
import com.optimize.elykia.core.entity.CommercialAccountAssignment;
import com.optimize.elykia.core.entity.Promoter;
import com.optimize.elykia.core.repository.CommercialAccountAssignmentRepository;
import com.optimize.elykia.core.repository.PromoterRepository;
import com.optimize.elykia.core.service.user.UserManagement;
import com.optimize.elykia.shared.security.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommercialAccountAssignmentService {

    private final CommercialAccountAssignmentRepository assignmentRepository;
    private final PromoterRepository promoterRepository;
    private final UserService userService;
    private final UserManagement userManagement;
    private final CommercialStaffService staffService;

    public List<CommercialAccountDto> listAccounts() {
        LocalDate today = LocalDate.now();
        Map<Long, CommercialAccountAssignment> currentByUser = new HashMap<>();
        for (CommercialAccountAssignment assignment : assignmentRepository.findCovering(State.ENABLED, today)) {
            currentByUser.merge(assignment.getUserId(), assignment, CommercialAccountAssignmentService::preferLatest);
        }
        Map<Long, Promoter> people = loadPeople(currentByUser.values().stream().map(CommercialAccountAssignment::getPromoterId).toList());
        return userManagement.getPromoters().stream()
                .sorted(Comparator.comparing(User::getUsername, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(user -> toAccount(user, currentByUser.get(user.getId()), people))
                .toList();
    }

    public List<CommercialAssignmentDto> history(Long userId) {
        requireCommercialAccount(userId);
        return assignmentRepository.findByUserIdAndStateOrderByStartDateDesc(userId, State.ENABLED).stream()
                .map(this::toDto)
                .toList();
    }

    public List<CommercialAssignmentDto> historyForPerson(Long promoterId) {
        staffService.require(promoterId);
        return assignmentRepository.findByPromoterIdAndStateOrderByStartDateDesc(promoterId, State.ENABLED).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public CommercialAssignmentDto create(Long userId, CommercialAssignmentWriteDto dto) {
        requireCommercialAccount(userId);
        Period period = period(dto);
        Promoter person = requirePerson(period.promoterId());
        assertNoOverlap(userId, person.getId(), period.start(), period.end(), null);
        CommercialAccountAssignment assignment = new CommercialAccountAssignment();
        assignment.setUserId(userId);
        assignment.setPromoterId(person.getId());
        assignment.setStartDate(period.start());
        assignment.setEndDate(period.end());
        return toDto(save(assignment));
    }

    @Transactional
    public CommercialAssignmentDto update(Long id, CommercialAssignmentWriteDto dto) {
        CommercialAccountAssignment assignment = requireAssignment(id);
        Period period = period(dto);
        Promoter person = requirePerson(period.promoterId());
        assertNoOverlap(assignment.getUserId(), person.getId(), period.start(), period.end(), assignment.getId());
        assignment.setPromoterId(person.getId());
        assignment.setStartDate(period.start());
        assignment.setEndDate(period.end());
        return toDto(save(assignment));
    }

    @Transactional
    public void delete(Long id) {
        CommercialAccountAssignment assignment = requireAssignment(id);
        assignment.setState(State.DELETED);
        save(assignment);
    }

    private CommercialAccountAssignment save(CommercialAccountAssignment assignment) {
        try {
            return assignmentRepository.saveAndFlush(assignment);
        } catch (DataIntegrityViolationException ex) {
            throw new CustomValidationException("Cette période chevauche une affectation déjà enregistrée.");
        }
    }

    private void assertNoOverlap(Long userId, Long promoterId, LocalDate start, LocalDate end, Long excludeId) {
        for (CommercialAccountAssignment existing : assignmentRepository.findByUserIdAndState(userId, State.ENABLED)) {
            if (Objects.equals(existing.getId(), excludeId)) {
                continue;
            }
            if (AssignmentPeriod.overlaps(start, end, existing.getStartDate(), existing.getEndDate())) {
                if (existing.getEndDate() == null) {
                    throw new CustomValidationException(
                            "Une affectation est déjà ouverte sur ce compte. Clôturez-la avant d'en ouvrir une autre.");
                }
                throw new CustomValidationException("Cette période chevauche une affectation déjà enregistrée sur ce compte.");
            }
        }
        for (CommercialAccountAssignment existing : assignmentRepository.findByPromoterIdAndState(promoterId, State.ENABLED)) {
            if (Objects.equals(existing.getId(), excludeId)) {
                continue;
            }
            if (AssignmentPeriod.overlaps(start, end, existing.getStartDate(), existing.getEndDate())) {
                throw new CustomValidationException("Cette personne tient déjà un compte commercial sur cette période.");
            }
        }
    }

    private Period period(CommercialAssignmentWriteDto dto) {
        if (dto == null || dto.promoterId() == null) {
            throw new CustomValidationException("Choisissez une personne.");
        }
        if (dto.startDate() == null) {
            throw new CustomValidationException("La date de début est obligatoire.");
        }
        if (dto.endDate() != null && dto.endDate().isBefore(dto.startDate())) {
            throw new CustomValidationException("La date de fin ne peut pas précéder la date de début.");
        }
        return new Period(dto.promoterId(), dto.startDate(), dto.endDate());
    }

    private User requireCommercialAccount(Long userId) {
        User user = userService.getById(userId);
        if (user == null || user.isDeleted() || !user.is(UserProfilConstant.PROMOTER)) {
            throw new CustomValidationException("Ce compte n'est pas un compte commercial.");
        }
        return user;
    }

    private Promoter requirePerson(Long promoterId) {
        return staffService.require(promoterId);
    }

    private CommercialAccountAssignment requireAssignment(Long id) {
        return assignmentRepository.findById(id)
                .filter(assignment -> assignment.getState() == State.ENABLED)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
    }

    private CommercialAssignmentDto toDto(CommercialAccountAssignment assignment) {
        Promoter person = promoterRepository.findById(assignment.getPromoterId()).orElse(null);
        User user = userService.getById(assignment.getUserId());
        String name = person == null ? "" : person.getName();
        LocalDate today = LocalDate.now();
        boolean current = !assignment.getStartDate().isAfter(today)
                && (assignment.getEndDate() == null || !assignment.getEndDate().isBefore(today));
        return new CommercialAssignmentDto(
                assignment.getId(),
                assignment.getUserId(),
                user == null ? null : user.getUsername(),
                assignment.getPromoterId(),
                name,
                person == null ? null : staffService.toDto(person).photoUrl(),
                CommercialStaffService.initials(name),
                assignment.getStartDate(),
                assignment.getEndDate(),
                current);
    }

    private CommercialAccountDto toAccount(User user, CommercialAccountAssignment current, Map<Long, Promoter> people) {
        if (current == null) {
            return new CommercialAccountDto(
                    user.getId(), user.getUsername(), user.getFirstname(), user.getLastname(),
                    null, null, null, null, null, null);
        }
        Promoter person = people.get(current.getPromoterId());
        String name = person == null ? null : person.getName();
        return new CommercialAccountDto(
                user.getId(),
                user.getUsername(),
                user.getFirstname(),
                user.getLastname(),
                current.getId(),
                current.getPromoterId(),
                name,
                person == null ? null : staffService.toDto(person).photoUrl(),
                CommercialStaffService.initials(name),
                current.getStartDate());
    }

    private Map<Long, Promoter> loadPeople(List<Long> ids) {
        Map<Long, Promoter> people = new HashMap<>();
        if (ids == null || ids.isEmpty()) {
            return people;
        }
        promoterRepository.findAllById(ids).forEach(person -> people.put(person.getId(), person));
        return people;
    }

    private static CommercialAccountAssignment preferLatest(CommercialAccountAssignment left, CommercialAccountAssignment right) {
        if (left.getStartDate() == null) {
            return right;
        }
        if (right.getStartDate() == null || !right.getStartDate().isAfter(left.getStartDate())) {
            return left;
        }
        return right;
    }

    private record Period(Long promoterId, LocalDate start, LocalDate end) {
    }
}
