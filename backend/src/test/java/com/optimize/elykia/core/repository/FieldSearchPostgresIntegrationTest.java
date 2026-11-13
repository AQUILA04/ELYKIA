package com.optimize.elykia.core.repository;

import com.optimize.common.entities.enums.State;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.repository.ClientRepository;
import com.optimize.elykia.core.dto.sale.RmFieldTontineRowDto;
import com.optimize.elykia.core.entity.sale.Order;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.entity.tontine.TontineSession;
import com.optimize.elykia.core.enumaration.OrderStatus;
import com.optimize.elykia.core.enumaration.RmFieldListProgress;
import com.optimize.elykia.core.enumaration.TontineMemberDeliveryStatus;
import com.optimize.elykia.core.enumaration.TontineMemberFrequency;
import com.optimize.elykia.core.enumaration.TontineSessionStatus;
import com.optimize.elykia.core.service.sale.RecoveryFieldPlanService;
import com.optimize.elykia.core.support.IntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class FieldSearchPostgresIntegrationTest extends IntegrationTestSupport {

    @Autowired private TontineMemberRepository tontineMemberRepository;
    @Autowired private TontineSessionRepository sessionRepository;
    @Autowired private ClientRepository clientRepository;
    @Autowired private RecoveryFieldPlanService recoveryFieldPlanService;
    @Autowired private OrderRepository orderRepository;

    @Test
    void tontineFieldSearchAcceptsNullEmptyAndTextOnPostgres() {
        int year = LocalDate.now().getYear();
        TontineSession session = sessionRepository.findByYear(year).orElseGet(() -> persistSession(year));
        Client tonton = persistClient("Tonton", "AaaZxqfield", "90 12 77 01", "zxq-tonton");
        Client awa = persistClient("Awa", "AaaZxqfield", "11 22 33 44", "zxq-awa");
        TontineMember tontonMember = persistMember(session, tonton);
        TontineMember awaMember = persistMember(session, awa);

        Page<RmFieldTontineRowDto> nullSearch = tontineMemberRepository.pageFieldRows(
                year, State.ENABLED, null, null, "ALL", PageRequest.of(0, 500));
        Page<RmFieldTontineRowDto> emptySearch = tontineMemberRepository.pageFieldRows(
                year, State.ENABLED, "", "", "ALL", PageRequest.of(0, 500));
        Page<RmFieldTontineRowDto> byName = tontineMemberRepository.pageFieldRows(
                year, State.ENABLED, "%tonton%", "", "TODO", PageRequest.of(0, 50));
        Page<RmFieldTontineRowDto> byDigits = tontineMemberRepository.pageFieldRows(
                year, State.ENABLED, "%9012%", "%901277%", "ALL", PageRequest.of(0, 50));
        Page<RmFieldTontineRowDto> done = tontineMemberRepository.pageFieldRows(
                year, State.ENABLED, "%tonton%", "", "DONE", PageRequest.of(0, 50));

        assertTrue(nullSearch.getTotalElements() >= 2);
        assertTrue(emptySearch.getTotalElements() >= 2);
        assertTrue(contains(byName, tontonMember.getId()));
        assertFalse(contains(byName, awaMember.getId()));
        assertTrue(contains(byDigits, tontonMember.getId()));
        assertFalse(contains(byDigits, awaMember.getId()));
        assertFalse(contains(done, tontonMember.getId()));

        Page<RmFieldTontineRowDto> serviceNull = recoveryFieldPlanService.pageTontineMembers(
                null, 0, 30, RmFieldListProgress.ALL);
        Page<RmFieldTontineRowDto> serviceBlank = recoveryFieldPlanService.pageTontineMembers(
                "   ", 0, 30, RmFieldListProgress.TODO);
        Page<RmFieldTontineRowDto> serviceName = recoveryFieldPlanService.pageTontineMembers(
                "tonton", 0, 30, RmFieldListProgress.ALL);
        Page<RmFieldTontineRowDto> serviceMiss = recoveryFieldPlanService.pageTontineMembers(
                "tonton", 0, 30, RmFieldListProgress.DONE);

        assertTrue(serviceNull.getTotalElements() >= 2);
        assertTrue(serviceBlank.getTotalElements() >= 1);
        assertTrue(contains(serviceName, tontonMember.getId()));
        assertFalse(contains(serviceName, awaMember.getId()));
        assertFalse(contains(serviceMiss, tontonMember.getId()));
    }

    @Test
    void orderSearchAcceptsNullEmptyAndTextOnPostgres() {
        Client client = persistClient("Ordernullsafezxq", "Diallo", "70 00 00 01", "zxq-order");
        Order order = new Order();
        order.setClient(client);
        order.setOrderDate(LocalDateTime.now());
        order.setTotalAmount(1_000.0);
        order.setTotalPurchasePrice(800.0);
        order.setStatus(OrderStatus.PENDING);
        Order saved = orderRepository.saveAndFlush(order);
        Long orderId = saved.getId();

        Page<Order> nullSearch = orderRepository.searchOrders(
                List.of(OrderStatus.PENDING), null, null, null, PageRequest.of(0, 200));
        Page<Order> emptySearch = orderRepository.searchOrders(
                List.of(OrderStatus.PENDING), null, "", "", PageRequest.of(0, 200));
        Page<Order> byName = orderRepository.searchOrders(
                List.of(OrderStatus.PENDING), null, "", "ordernullsafezxq", PageRequest.of(0, 20));
        Page<Order> miss = orderRepository.searchOrders(
                List.of(OrderStatus.PENDING), null, "", "absentzxq", PageRequest.of(0, 20));

        assertTrue(nullSearch.getTotalElements() >= 1);
        assertTrue(emptySearch.getTotalElements() >= 1);
        assertTrue(byName.getContent().stream().anyMatch(row -> row.getId().equals(orderId)));
        assertTrue(miss.getContent().stream().noneMatch(row -> row.getId().equals(orderId)));
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

    private Client persistClient(String firstname, String lastname, String phone, String code) {
        Client client = new Client();
        client.setFirstname(firstname);
        client.setLastname(lastname);
        client.setCode(code);
        client.setPhone(phone);
        client.setCollector("it.field.search");
        client.setTontineCollector("it.field.search");
        client.setClientType(ClientType.CLIENT);
        return clientRepository.saveAndFlush(client);
    }

    private TontineMember persistMember(TontineSession session, Client client) {
        TontineMember member = new TontineMember();
        member.setTontineSession(session);
        member.setClient(client);
        member.setRegistrationDate(LocalDateTime.of(session.getStartDate(), java.time.LocalTime.NOON));
        member.setFrequency(TontineMemberFrequency.DAILY);
        member.setAmount(500.0);
        member.setTotalContribution(0.0);
        member.setSocietyShare(0.0);
        member.setAvailableContribution(0.0);
        member.setValidatedMonths(0);
        member.setCurrentMonthDays(0);
        member.setDeliveryStatus(TontineMemberDeliveryStatus.SESSION_INPROGRESS);
        member.setCarnetVerified(false);
        return tontineMemberRepository.saveAndFlush(member);
    }

    private static boolean contains(Page<RmFieldTontineRowDto> page, Long id) {
        return page.getContent().stream().anyMatch(row -> id.equals(row.getId()));
    }
}
