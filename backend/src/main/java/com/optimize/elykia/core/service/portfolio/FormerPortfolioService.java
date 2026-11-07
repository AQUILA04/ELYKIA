package com.optimize.elykia.core.service.portfolio;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientCollectorType;
import com.optimize.elykia.client.repository.ClientCollectorHistoryRepository;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.portfolio.FormerAgencyClientDto;
import com.optimize.elykia.core.dto.portfolio.FormerAgencySaleDto;
import com.optimize.elykia.core.dto.portfolio.FormerCreditDetailDto;
import com.optimize.elykia.core.dto.portfolio.FormerCreditListItemDto;
import com.optimize.elykia.core.dto.portfolio.FormerCreditSeedDto;
import com.optimize.elykia.core.dto.portfolio.FormerCreditTimelineDto;
import com.optimize.elykia.core.dto.portfolio.FormerPortfolioSyncDto;
import com.optimize.elykia.core.dto.portfolio.FormerTontineCollectionDto;
import com.optimize.elykia.core.dto.portfolio.FormerTontineMemberDetailDto;
import com.optimize.elykia.core.dto.portfolio.FormerTontineMemberDto;
import com.optimize.elykia.core.entity.sale.Credit;
import com.optimize.elykia.core.entity.sale.CreditCollectorHistory;
import com.optimize.elykia.core.entity.tontine.TontineMember;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.repository.CreditCollectorHistoryRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.repository.TontineCollectionRepository;
import com.optimize.elykia.core.repository.TontineMemberRepository;
import com.optimize.elykia.core.service.notification.AppNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FormerPortfolioService {

    static final int SYNC_LIMIT = 500;
    public static final String DENIED = "Ce dossier ne fait pas partie de votre portefeuille.";
    static final String PROMOTER_ONLY = "L'ancien portefeuille est réservé au commercial.";
    static final String NOT_FORMER = "Ce dossier n'est pas dans votre ancien portefeuille.";

    private final UserService userService;
    private final ClientService clientService;
    private final TontineMemberRepository tontineMemberRepository;
    private final TontineCollectionRepository tontineCollectionRepository;
    private final ClientCollectorHistoryRepository clientCollectorHistoryRepository;
    private final CreditRepository creditRepository;
    private final CreditTimelineRepository creditTimelineRepository;
    private final CreditCollectorHistoryRepository creditCollectorHistoryRepository;

    public Page<FormerTontineMemberDto> listFormerTontineMembers(Pageable pageable) {
        User user = requirePromoter();
        return tontineMemberRepository.findFormerMembers(user.getUsername(), pageable);
    }

    public FormerTontineMemberDetailDto getFormerTontineMember(Long memberId) {
        User user = requirePromoter();
        TontineMember member = loadMember(memberId);
        if (decideTontine(user, member) != FormerPortfolioAccess.Level.FORMER) {
            throw new CustomValidationException(NOT_FORMER);
        }
        return toTontineDetail(member, user.getUsername());
    }

    public List<FormerTontineCollectionDto> ownTontineCollections(Long memberId) {
        User user = requirePromoter();
        return tontineCollectionRepository.findOwnCollections(memberId, user.getUsername());
    }

    public Page<FormerCreditListItemDto> listFormerCredits(Pageable pageable) {
        User user = requirePromoter();
        Page<FormerCreditSeedDto> seeds = creditRepository.findFormerCredits(user.getUsername(), pageable);
        List<FormerCreditListItemDto> items = enrichCredits(seeds.getContent(), user.getUsername());
        return new PageImpl<>(items, pageable, seeds.getTotalElements());
    }

    public FormerCreditDetailDto getFormerCredit(Long creditId) {
        User user = requirePromoter();
        Credit credit = loadCredit(creditId);
        if (decideCredit(user, credit) != FormerPortfolioAccess.Level.FORMER) {
            throw new CustomValidationException(NOT_FORMER);
        }
        if (credit.getType() == OperationType.CASH) {
            return cashAsFormerDetail(credit, user.getUsername());
        }
        FormerCreditSeedDto seed = seedOf(credit);
        FormerCreditListItemDto item = enrichCredits(List.of(seed), user.getUsername()).get(0);
        List<FormerCreditTimelineDto> timelines = creditTimelineRepository.findOwnByCredit(creditId, user.getUsername());
        return toCreditDetail(item, timelines);
    }

    public List<FormerCreditTimelineDto> ownCreditTimelines(Long creditId) {
        User user = requirePromoter();
        return creditTimelineRepository.findOwnByCredit(creditId, user.getUsername());
    }

    public Page<FormerAgencyClientDto> listFormerAgencyClients(Pageable pageable) {
        User user = requirePromoter();
        Page<Long> ids = creditRepository.findFormerAgencyClientIds(user.getUsername(), pageable);
        List<FormerAgencyClientDto> content = groupAgency(ids.getContent(), user.getUsername());
        return new PageImpl<>(content, pageable, ids.getTotalElements());
    }

    public FormerAgencyClientDto getFormerAgencyClient(Long clientId) {
        User user = requirePromoter();
        Client client = clientService.getById(clientId);
        if (client == null || same(client.getAgencyCollector(), user.getUsername())) {
            throw new CustomValidationException(NOT_FORMER);
        }
        List<FormerAgencyClientDto> grouped = groupAgency(List.of(clientId), user.getUsername());
        if (grouped.isEmpty()) {
            throw new CustomValidationException(NOT_FORMER);
        }
        return grouped.get(0);
    }

    public FormerPortfolioSyncDto sync() {
        User user = requirePromoter();
        String commercial = user.getUsername();
        Pageable cap = PageRequest.of(0, SYNC_LIMIT);
        List<FormerTontineMemberDto> members = tontineMemberRepository.findFormerMembers(commercial, cap).getContent();
        List<FormerTontineCollectionDto> collections =
                tontineCollectionRepository.findFormerOwnCollections(commercial, cap);
        List<FormerCreditListItemDto> credits = enrichCredits(
                creditRepository.findFormerCredits(commercial, cap).getContent(), commercial);
        List<Long> creditIds = credits.stream().map(FormerCreditListItemDto::creditId).toList();
        List<FormerCreditTimelineDto> timelines = creditIds.isEmpty()
                ? List.of()
                : creditTimelineRepository.findOwnByCreditIds(creditIds, commercial);
        List<Long> agencyIds = creditRepository.findFormerAgencyClientIds(commercial, cap).getContent();
        List<FormerAgencySaleDto> agencySales = agencyIds.isEmpty()
                ? List.of()
                : creditRepository.findFormerAgencySales(agencyIds, commercial);
        return new FormerPortfolioSyncDto(members, collections, credits, timelines, agencySales);
    }

    public FormerPortfolioAccess.Level decideTontineMember(Long memberId) {
        return decideTontine(userService.getCurrentUser(), loadMember(memberId));
    }

    public FormerPortfolioAccess.Level decideCredit(Long creditId) {
        return decideCredit(userService.getCurrentUser(), loadCredit(creditId));
    }

    public void assertFullTontineMember(Long memberId) {
        if (decideTontineMember(memberId) != FormerPortfolioAccess.Level.FULL) {
            throw new CustomValidationException(DENIED);
        }
    }

    public void assertFullCredit(Long creditId) {
        if (decideCredit(creditId) != FormerPortfolioAccess.Level.FULL) {
            throw new CustomValidationException(DENIED);
        }
    }

    private FormerPortfolioAccess.Level decideTontine(User user, TontineMember member) {
        boolean promoterOnly = AppNotificationService.isPromoterOnly(user);
        String collector = member.getClient() == null ? null : member.getClient().getTontineCollector();
        boolean current = AppNotificationService.matchesTontineCollector(user, collector);
        boolean former = false;
        if (promoterOnly && !current && user != null && StringUtils.hasText(user.getUsername())) {
            String commercial = user.getUsername();
            former = tontineCollectionRepository
                    .existsByTontineMember_IdAndStateAndCommercialUsernameIgnoreCase(
                            member.getId(), State.ENABLED, commercial);
            if (!former && member.getClient() != null) {
                former = clientCollectorHistoryRepository
                        .existsByClientIdAndCollectorTypeAndOldCollectorIgnoreCaseAndState(
                                member.getClient().getId(), ClientCollectorType.TONTINE, commercial, State.ENABLED);
            }
        }
        return FormerPortfolioAccess.decide(promoterOnly, current, former);
    }

    private FormerPortfolioAccess.Level decideCredit(User user, Credit credit) {
        boolean promoterOnly = AppNotificationService.isPromoterOnly(user);
        boolean cash = credit.getType() == OperationType.CASH;
        String holder = cash
                ? (credit.getClient() == null ? null : credit.getClient().getAgencyCollector())
                : credit.getCollector();
        boolean current = AppNotificationService.matchesCreditCollector(user, holder);
        boolean former = false;
        if (promoterOnly && !current && user != null && StringUtils.hasText(user.getUsername())) {
            String commercial = user.getUsername();
            if (cash && (same(credit.getAgencyCommercial(), commercial) || same(credit.getCollector(), commercial))) {
                former = true;
            }
            former = former || creditCollectorHistoryRepository
                    .existsByCredit_IdAndStateAndOldCollectorIgnoreCase(credit.getId(), State.ENABLED, commercial)
                    || creditTimelineRepository
                    .existsByCredit_IdAndStateAndCollectorIgnoreCase(credit.getId(), State.ENABLED, commercial);
        }
        return FormerPortfolioAccess.decide(promoterOnly, current, former);
    }

    private FormerTontineMemberDetailDto toTontineDetail(TontineMember member, String commercial) {
        List<FormerTontineCollectionDto> collections =
                tontineCollectionRepository.findOwnCollections(member.getId(), commercial);
        double total = collections.stream()
                .mapToDouble(line -> line.amount() == null ? 0.0 : line.amount())
                .sum();
        Client client = member.getClient();
        Integer year = member.getTontineSession() == null ? null : member.getTontineSession().getYear();
        return new FormerTontineMemberDetailDto(
                member.getId(),
                year,
                client == null ? null : client.getId(),
                client == null ? null : client.getCode(),
                client == null ? null : client.getFirstname(),
                client == null ? null : client.getLastname(),
                client == null ? null : client.getPhone(),
                client == null ? null : client.getQuarter(),
                total,
                collections);
    }

    private List<FormerCreditListItemDto> enrichCredits(List<FormerCreditSeedDto> seeds, String commercial) {
        if (seeds == null || seeds.isEmpty()) {
            return List.of();
        }
        List<Long> ids = seeds.stream().map(FormerCreditSeedDto::creditId).toList();
        Map<Long, CreditCollectorHistory> handover = new HashMap<>();
        for (CreditCollectorHistory history : creditCollectorHistoryRepository
                .findEnabledByCreditsAndOldCollector(ids, commercial)) {
            handover.putIfAbsent(history.getCredit().getId(), history);
        }
        Map<Long, Double> sums = new HashMap<>();
        for (Object[] row : creditTimelineRepository.sumOwnAmountByCreditIds(ids, commercial)) {
            if (row[0] instanceof Number id && row[1] instanceof Number amount) {
                sums.put(id.longValue(), amount.doubleValue());
            }
        }
        List<FormerCreditListItemDto> items = new ArrayList<>(seeds.size());
        for (FormerCreditSeedDto seed : seeds) {
            CreditCollectorHistory history = handover.get(seed.creditId());
            items.add(new FormerCreditListItemDto(
                    seed.creditId(),
                    seed.reference(),
                    seed.clientId(),
                    seed.clientCode(),
                    seed.firstname(),
                    seed.lastname(),
                    seed.phone(),
                    seed.quarter(),
                    seed.beginDate(),
                    history == null ? null : history.getChangeDate(),
                    history == null ? null : history.getTotalAmount(),
                    history == null ? null : history.getTotalAmountPaid(),
                    history == null ? null : history.getTotalAmountRemaining(),
                    sums.getOrDefault(seed.creditId(), 0.0)));
        }
        return items;
    }

    private FormerCreditDetailDto cashAsFormerDetail(Credit credit, String commercial) {
        Client client = credit.getClient();
        List<FormerCreditTimelineDto> timelines = creditTimelineRepository.findOwnByCredit(credit.getId(), commercial);
        double own = timelines.stream().mapToDouble(line -> line.amount() == null ? 0.0 : line.amount()).sum();
        return new FormerCreditDetailDto(
                credit.getId(),
                credit.getReference(),
                client == null ? null : client.getId(),
                client == null ? null : client.getCode(),
                client == null ? null : client.getFirstname(),
                client == null ? null : client.getLastname(),
                client == null ? null : client.getPhone(),
                client == null ? null : client.getQuarter(),
                credit.getBeginDate(),
                null,
                credit.getTotalAmount(),
                null,
                null,
                own,
                timelines);
    }

    private static FormerCreditDetailDto toCreditDetail(FormerCreditListItemDto item,
                                                        List<FormerCreditTimelineDto> timelines) {
        return new FormerCreditDetailDto(
                item.creditId(),
                item.reference(),
                item.clientId(),
                item.clientCode(),
                item.firstname(),
                item.lastname(),
                item.phone(),
                item.quarter(),
                item.beginDate(),
                item.handoverDate(),
                item.totalAmountAtHandover(),
                item.totalPaidAtHandover(),
                item.totalRemainingAtHandover(),
                item.ownRecoveriesTotal(),
                timelines);
    }

    private static FormerCreditSeedDto seedOf(Credit credit) {
        Client client = credit.getClient();
        return new FormerCreditSeedDto(
                credit.getId(),
                credit.getReference(),
                client == null ? null : client.getId(),
                client == null ? null : client.getCode(),
                client == null ? null : client.getFirstname(),
                client == null ? null : client.getLastname(),
                client == null ? null : client.getPhone(),
                client == null ? null : client.getQuarter(),
                credit.getBeginDate());
    }

    private List<FormerAgencyClientDto> groupAgency(Collection<Long> clientIds, String commercial) {
        if (clientIds == null || clientIds.isEmpty()) {
            return List.of();
        }
        List<FormerAgencySaleDto> sales = creditRepository.findFormerAgencySales(clientIds, commercial);
        Map<Long, List<FormerAgencySaleDto>> byClient = new LinkedHashMap<>();
        for (Long clientId : clientIds) {
            byClient.put(clientId, new ArrayList<>());
        }
        for (FormerAgencySaleDto sale : sales) {
            byClient.computeIfAbsent(sale.clientId(), ignored -> new ArrayList<>()).add(sale);
        }
        List<FormerAgencyClientDto> grouped = new ArrayList<>();
        for (Map.Entry<Long, List<FormerAgencySaleDto>> entry : byClient.entrySet()) {
            List<FormerAgencySaleDto> clientSales = entry.getValue();
            if (clientSales.isEmpty()) {
                continue;
            }
            FormerAgencySaleDto first = clientSales.get(0);
            double total = clientSales.stream()
                    .mapToDouble(sale -> sale.totalAmount() == null ? 0.0 : sale.totalAmount())
                    .sum();
            grouped.add(new FormerAgencyClientDto(
                    entry.getKey(),
                    first.clientCode(),
                    first.firstname(),
                    first.lastname(),
                    first.phone(),
                    first.quarter(),
                    total,
                    List.copyOf(clientSales)));
        }
        return grouped;
    }

    private TontineMember loadMember(Long memberId) {
        return tontineMemberRepository.findById(memberId)
                .filter(member -> member.getState() == State.ENABLED)
                .orElseThrow(() -> new CustomValidationException("Membre introuvable."));
    }

    private Credit loadCredit(Long creditId) {
        return creditRepository.findById(creditId)
                .filter(credit -> credit.getState() == State.ENABLED
                        || credit.getStatus() == CreditStatus.CANCELLED)
                .orElseThrow(() -> new CustomValidationException("Vente introuvable."));
    }

    private User requirePromoter() {
        User user = userService.getCurrentUser();
        if (!AppNotificationService.isPromoterOnly(user)) {
            throw new CustomValidationException(PROMOTER_ONLY);
        }
        return user;
    }

    private static boolean same(String left, String right) {
        return StringUtils.hasText(left) && StringUtils.hasText(right) && left.equalsIgnoreCase(right);
    }
}
