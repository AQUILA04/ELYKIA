package com.optimize.elykia.core.service.commercial;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.core.dto.commercial.CommercialAssignmentWriteDto;
import com.optimize.elykia.core.entity.CommercialAccountAssignment;
import com.optimize.elykia.core.entity.Promoter;
import com.optimize.elykia.core.repository.CommercialAccountAssignmentRepository;
import com.optimize.elykia.core.repository.PromoterRepository;
import com.optimize.elykia.core.service.user.UserManagement;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommercialAccountAssignmentServiceTest {

    @Mock
    private CommercialAccountAssignmentRepository assignmentRepository;
    @Mock
    private PromoterRepository promoterRepository;
    @Mock
    private UserService userService;
    @Mock
    private UserManagement userManagement;
    @Mock
    private CommercialStaffService staffService;

    private CommercialAccountAssignmentService service;

    @BeforeEach
    void setUp() {
        service = new CommercialAccountAssignmentService(
                assignmentRepository, promoterRepository, userService, userManagement, staffService);
    }

    @Test
    void createRejectsAnOverlapOnTheSameAccount() {
        User account = commercial("COM001");
        when(userService.getById(7L)).thenReturn(account);
        when(staffService.require(4L)).thenReturn(person(4L, "Kofi"));
        when(assignmentRepository.findByUserIdAndState(7L, State.ENABLED))
                .thenReturn(List.of(period(1L, 7L, 3L, LocalDate.of(2024, 1, 1), null)));

        CommercialAssignmentWriteDto dto = new CommercialAssignmentWriteDto(
                4L, LocalDate.of(2024, 6, 1), null);

        CustomValidationException error = assertThrows(CustomValidationException.class, () -> service.create(7L, dto));

        assertEquals("Une affectation est déjà ouverte sur ce compte. Clôturez-la avant d'en ouvrir une autre.", error.getMessage());
        verify(assignmentRepository, never()).saveAndFlush(any());
    }

    @Test
    void createRejectsWhenTheSamePersonAlreadyHoldsAnotherAccount() {
        User account = commercial("COM002");
        when(userService.getById(8L)).thenReturn(account);
        when(staffService.require(3L)).thenReturn(person(3L, "Awa"));
        when(assignmentRepository.findByUserIdAndState(8L, State.ENABLED)).thenReturn(List.of());
        when(assignmentRepository.findByPromoterIdAndState(3L, State.ENABLED))
                .thenReturn(List.of(period(9L, 7L, 3L, LocalDate.of(2024, 1, 1), LocalDate.of(2024, 12, 31))));

        CommercialAssignmentWriteDto dto = new CommercialAssignmentWriteDto(
                3L, LocalDate.of(2024, 6, 1), LocalDate.of(2024, 8, 1));

        CustomValidationException error = assertThrows(CustomValidationException.class, () -> service.create(8L, dto));

        assertEquals("Cette personne tient déjà un compte commercial sur cette période.", error.getMessage());
    }

    @Test
    void createAllowsTheSamePersonOnALaterPeriod() {
        User account = commercial("COM001");
        Promoter awa = person(3L, "Awa Koffi");
        when(userService.getById(7L)).thenReturn(account);
        when(staffService.require(3L)).thenReturn(awa);
        when(assignmentRepository.findByUserIdAndState(7L, State.ENABLED))
                .thenReturn(List.of(period(1L, 7L, 3L, LocalDate.of(2023, 1, 1), LocalDate.of(2023, 12, 31))));
        when(assignmentRepository.findByPromoterIdAndState(3L, State.ENABLED))
                .thenReturn(List.of(period(1L, 7L, 3L, LocalDate.of(2023, 1, 1), LocalDate.of(2023, 12, 31))));
        when(assignmentRepository.saveAndFlush(any())).thenAnswer(invocation -> {
            CommercialAccountAssignment saved = invocation.getArgument(0);
            saved.setId(20L);
            return saved;
        });
        when(promoterRepository.findById(3L)).thenReturn(Optional.of(awa));
        when(staffService.toDto(awa)).thenReturn(new com.optimize.elykia.core.dto.commercial.CommercialStaffDto(
                3L, "Awa Koffi", null, null, null, null, "AK"));

        var created = service.create(7L, new CommercialAssignmentWriteDto(
                3L, LocalDate.of(2025, 1, 1), null));

        assertEquals(20L, created.id());
        assertEquals("COM001", created.username());
        assertEquals(LocalDate.of(2025, 1, 1), created.startDate());
    }

    @Test
    void createRejectsANonCommercialAccount() {
        User other = org.mockito.Mockito.mock(User.class);
        when(other.isDeleted()).thenReturn(false);
        when(other.is(UserProfilConstant.PROMOTER)).thenReturn(false);
        when(userService.getById(4L)).thenReturn(other);

        assertThrows(CustomValidationException.class, () -> service.create(
                4L, new CommercialAssignmentWriteDto(3L, LocalDate.of(2024, 1, 1), null)));
    }

    private static User commercial(String username) {
        User user = org.mockito.Mockito.mock(User.class);
        when(user.isDeleted()).thenReturn(false);
        when(user.is(UserProfilConstant.PROMOTER)).thenReturn(true);
        lenient().when(user.getUsername()).thenReturn(username);
        lenient().when(user.getId()).thenReturn(7L);
        return user;
    }

    private static Promoter person(Long id, String name) {
        Promoter promoter = new Promoter();
        promoter.setId(id);
        promoter.setName(name);
        promoter.setState(State.ENABLED);
        return promoter;
    }

    private static CommercialAccountAssignment period(Long id, Long userId, Long promoterId, LocalDate start, LocalDate end) {
        CommercialAccountAssignment assignment = new CommercialAccountAssignment();
        assignment.setId(id);
        assignment.setUserId(userId);
        assignment.setPromoterId(promoterId);
        assignment.setStartDate(start);
        assignment.setEndDate(end);
        assignment.setState(State.ENABLED);
        return assignment;
    }
}
