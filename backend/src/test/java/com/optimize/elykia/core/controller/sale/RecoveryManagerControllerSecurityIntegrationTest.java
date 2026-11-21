package com.optimize.elykia.core.controller.sale;

import com.optimize.common.securities.security.services.UserDetailsImpl;
import com.optimize.elykia.core.dto.sale.RecoveryManagerActivityDto;
import com.optimize.elykia.core.dto.sale.RecoveryManagerReportSummaryDto;
import com.optimize.elykia.core.service.sale.RecoveryManagerActivityService;
import com.optimize.elykia.core.service.sale.RecoveryManagerService;
import com.optimize.elykia.core.support.IntegrationTestSupport;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Droits du rapport de recouvrement terrain, avec la sécurité de méthode réelle.
 * Les autorités sont les permissions de l'utilisateur, comme {@link UserDetailsImpl#build}.
 */
@SpringBootTest
@ActiveProfiles("test")
class RecoveryManagerControllerSecurityIntegrationTest extends IntegrationTestSupport {

    private static final LocalDate DAY = LocalDate.of(2026, 11, 21);

    @Autowired private RecoveryManagerController controller;
    @MockBean private RecoveryManagerActivityService activityService;
    @MockBean private RecoveryManagerService recoveryManagerService;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void gestionnaireReadsTheChefHeChooses() {
        // Profil GESTIONNAIRE : pas de ROLE_GESTIONNAIRE ni de ROLE_ADMIN parmi ses permissions.
        authenticate("ges003", "GESTIONNAIRE", "ROLE_REPORT", "ROLE_PROMOTER");
        when(activityService.getActivity(any(), any(), any(), any()))
                .thenReturn(RecoveryManagerActivityDto.builder().build());
        when(recoveryManagerService.getReportSummary(any(), any(), any(), any()))
                .thenReturn(RecoveryManagerReportSummaryDto.builder().build());

        assertThat(controller.getReportActivity(DAY, DAY, "recov001", null).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(controller.getReportSummary(DAY, DAY, "recov001", null).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        verify(activityService).getActivity(eq(DAY), eq(DAY), eq("recov001"), isNull());
        verify(recoveryManagerService).getReportSummary(eq(DAY), eq(DAY), eq("recov001"), isNull());
    }

    @Test
    void adminProfilesAreAllowed() {
        when(activityService.getActivity(any(), any(), any(), any()))
                .thenReturn(RecoveryManagerActivityDto.builder().build());

        authenticate("admin", "ADMIN", "ROLE_ADMIN");
        assertThat(controller.getReportActivity(DAY, DAY, "recov001", null).getStatusCode())
                .isEqualTo(HttpStatus.OK);

        authenticate("root", "SUPER_ADMIN", "ROLE_ADMIN", "ROLE_ROOT");
        assertThat(controller.getReportActivity(DAY, DAY, "recov001", null).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    void recoveryManagerIsForcedToHisOwnReport() {
        authenticate("recov001", "RECOVERY_MANAGER", "ROLE_RECOVERY_MANAGER", "ROLE_CONSULT_CREDIT");
        when(activityService.getActivity(any(), any(), any(), any()))
                .thenReturn(RecoveryManagerActivityDto.builder().build());
        when(recoveryManagerService.getReportSummary(any(), any(), any(), any()))
                .thenReturn(RecoveryManagerReportSummaryDto.builder().build());

        controller.getReportActivity(DAY, DAY, "recov002", "com001");
        controller.getReportSummary(DAY, DAY, "recov002", null);

        verify(activityService).getActivity(eq(DAY), eq(DAY), eq("recov001"), eq("com001"));
        verify(recoveryManagerService).getReportSummary(eq(DAY), eq(DAY), eq("recov001"), isNull());
    }

    @Test
    void otherProfilesAreDenied() {
        authenticate("com001", "PROMOTER", "ROLE_PROMOTER", "ROLE_REPORT");

        assertThatThrownBy(() -> controller.getReportActivity(DAY, DAY, null, null))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.getReportSummary(DAY, DAY, null, null))
                .isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.getMonthlyRecoveryRate(2026, 11, null))
                .isInstanceOf(AccessDeniedException.class);
    }

    private static void authenticate(String username, String profile, String... permissions) {
        List<SimpleGrantedAuthority> authorities = Arrays.stream(permissions)
                .map(SimpleGrantedAuthority::new)
                .toList();
        UserDetailsImpl principal = new UserDetailsImpl(1L, username, username + "@test.local", "x",
                authorities, profile);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, authorities));
    }
}
