package com.optimize.elykia.core.service.sale;

import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.core.dto.sale.RecoveryManagerActivityDto;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineMemberFrequency;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.repository.TontineSessionRepository;
import com.optimize.elykia.core.support.IntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Bloc « Activité terrain » sur Postgres : sans filtre commercial, les requêtes JPQL
 * {@code LOWER(:commercial)} échouaient ({@code function lower(bytea) does not exist}).
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RecoveryManagerActivityPostgresIntegrationTest extends IntegrationTestSupport {

    private static final String COMMERCIAL = "it.rm.activity";
    private static final String OBSERVER = "it.rm.chef";

    @Autowired private RecoveryManagerActivityService activityService;
    @Autowired private CreditRepository creditRepository;
    @Autowired private TontineMemberRepository tontineMemberRepository;
    @Autowired private TontineSessionRepository sessionRepository;
    @Autowired private ClientRepository clientRepository;

    @Test
    void activityLoadsWithoutCommercialFilter() {
        int year = LocalDate.now().getYear();
        TontineSession session = sessionRepository.findByYear(year).orElseGet(() -> persistSession(year));
        persistMember(session, persistClient("Activite", "Zxqrm", "zxq-rm-1", COMMERCIAL));
        persistMember(session, persistClient("Autre", "Zxqrm", "zxq-rm-2", "it.rm.other"));
        LocalDate today = LocalDate.now();

        RecoveryManagerActivityDto all = activityService.getActivity(today, today, OBSERVER, null);
        RecoveryManagerActivityDto blank = activityService.getActivity(today, today, OBSERVER, "  ");
        RecoveryManagerActivityDto filtered = activityService.getActivity(today, today, OBSERVER, COMMERCIAL);
        RecoveryManagerActivityDto filteredOtherCase = activityService.getActivity(
                today, today, OBSERVER, COMMERCIAL.toUpperCase());

        assertThat(all.getTontinePortfolioTotal()).isGreaterThanOrEqualTo(2);
        assertThat(blank.getTontinePortfolioTotal()).isEqualTo(all.getTontinePortfolioTotal());
        assertThat(filtered.getTontinePortfolioTotal()).isEqualTo(1);
        assertThat(filteredOtherCase.getTontinePortfolioTotal()).isEqualTo(1);
        assertThat(all.getCreditPortfolioTotal()).isGreaterThanOrEqualTo(filtered.getCreditPortfolioTotal());
    }

    @Test
    void nullableCommercialQueriesRunOnPostgres() {
        int year = LocalDate.now().getYear();
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = start.plusDays(1);

        assertThatCode(() -> {
            creditRepository.countEnabledInProgress(null);
            creditRepository.countCarnetVerifiedByObserver(OBSERVER, start, end, null);
            tontineMemberRepository.countInProgressForSession(year, null);
            tontineMemberRepository.countCarnetVerifiedByObserver(OBSERVER, start, end, null);
        }).doesNotThrowAnyException();
    }

    private TontineSession persistSession(int year) {
        TontineSession session = new TontineSession();
        session.setYear(year);
        session.setStartDate(LocalDate.of(year, 1, 1));
        session.setEndDate(LocalDate.of(year, 12, 31));
        session.setStatus(TontineSessionStatus.ACTIVE);
        session.setTotalRevenue(0.0);
        return sessionRepository.saveAndFlush(session);
    }

    private Client persistClient(String firstname, String lastname, String code, String collector) {
        Client client = new Client();
        client.setFirstname(firstname);
        client.setLastname(lastname);
        client.setCode(code);
        client.setPhone("90 00 00 00");
        client.setCollector(collector);
        client.setTontineCollector(collector);
        client.setClientType(ClientType.CLIENT);
        return clientRepository.saveAndFlush(client);
    }

    private void persistMember(TontineSession session, Client client) {
        TontineMember member = new TontineMember();
        member.setTontineSession(session);
        member.setClient(client);
        member.setRegistrationDate(LocalDateTime.of(session.getStartDate(), LocalTime.NOON));
        member.setFrequency(TontineMemberFrequency.DAILY);
        member.setAmount(500.0);
        member.setTotalContribution(0.0);
        member.setSocietyShare(0.0);
        member.setAvailableContribution(0.0);
        member.setValidatedMonths(0);
        member.setCurrentMonthDays(0);
        member.setDeliveryStatus(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        member.setCarnetVerified(false);
        tontineMemberRepository.saveAndFlush(member);
    }
}
