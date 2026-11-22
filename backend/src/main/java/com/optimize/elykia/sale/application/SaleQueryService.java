package com.optimize.elykia.sale.application;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.finance.application.DailyAccountancyService;
import com.optimize.elykia.sale.domain.ClientReliquatNetRemaining;
import com.optimize.elykia.sale.domain.CommercialMonthlyStockItem;
import com.optimize.elykia.sale.domain.Credit;
import com.optimize.elykia.sale.domain.CreditArticles;
import com.optimize.elykia.sale.domain.CreditStatus;
import com.optimize.elykia.sale.domain.CreditTimeline;
import com.optimize.elykia.sale.domain.SolvencyStatus;
import com.optimize.elykia.sale.infrastructure.persistence.ClientReliquatRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CommercialMonthlyStockItemRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRecoveryQueryRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditRepository;
import com.optimize.elykia.sale.infrastructure.persistence.CreditSpecification;
import com.optimize.elykia.sale.infrastructure.persistence.CreditTimelineRepository;
import com.optimize.elykia.sale.infrastructure.persistence.SaleSearchQueryRepository;
import com.optimize.elykia.sale.web.dto.ClientDetails;
import com.optimize.elykia.sale.web.dto.CreditRespDto;
import com.optimize.elykia.sale.web.dto.CreditSearchDto;
import com.optimize.elykia.sale.web.dto.CreditSourceMonthlyStockDto;
import com.optimize.elykia.sale.web.dto.CreditTimelineRespDto;
import com.optimize.elykia.sale.web.dto.DailyUnrecoveredCreditDto;
import com.optimize.elykia.sale.web.dto.StockOutput;
import com.optimize.elykia.shared.domain.OperationType;
import com.optimize.elykia.shared.security.UserProfilConstant;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service applicatif lecture seule regroupant toutes les requêtes de consultation, recherche,
 * recouvrement du jour, historiques client/commercial et enrichissements de détail des ventes.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SaleQueryService {

    private final CreditRepository creditRepository;
    private final CreditRecoveryQueryRepository creditRecoveryQueryRepository;
    private final SaleSearchQueryRepository saleSearchQueryRepository;
    private final CreditTimelineRepository creditTimelineRepository;
    private final CreditArticlesService creditArticlesService;
    private final ClientService clientService;
    private final UserService userService;
    private final DailyAccountancyService dailyAccountancyService;
    private final ClientReliquatRepository clientReliquatRepository;
    private final CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository;

    public Page<CreditRespDto> elasticsearch(String keyword, Pageable pageable) {
        return CreditRespDto.fromCreditPage(saleSearchQueryRepository.elasticsearch(keyword, pageable));
    }

    public Page<CreditRespDto> searchCredits(CreditSearchDto dto, Pageable pageable) {
        Page<Credit> page = saleSearchQueryRepository.findAll(CreditSpecification.build(dto), pageable);
        return CreditRespDto.fromCreditPage(page);
    }

    public Page<DailyUnrecoveredCreditDto> getCreditByCollector(Pageable pageable) {
        User user = userService.getCurrentUser();
        if (user.is(UserProfilConstant.PROMOTER) && !dailyAccountancyService.isOpenCashDesk()) {
            throw new ApplicationException("Aucune caisse ouverte pour l'utilisateur " + user.getUsername());
        }
        LocalDateTime[] dayRange = getCurrentAccountingDayRange();
        Page<DailyUnrecoveredCreditDto> page = creditRecoveryQueryRepository.findUnrecoveredCreditsForDay(
                CreditStatus.INPROGRESS,
                user.getUsername(),
                ClientType.CLIENT,
                dayRange[0],
                dayRange[1],
                pageable);
        applyClientReliquatDeduction(page.getContent());
        return page;
    }

    public List<DailyUnrecoveredCreditDto> getCreditByCollector() {
        User user = userService.getCurrentUser();
        if (!dailyAccountancyService.isOpenCashDesk()) {
            throw new ApplicationException("Aucune caisse ouverte pour l'utilisateur " + user.getUsername());
        }
        LocalDateTime[] dayRange = getCurrentAccountingDayRange();
        List<DailyUnrecoveredCreditDto> credits = creditRecoveryQueryRepository.findUnrecoveredCreditsForDay(
                CreditStatus.INPROGRESS,
                user.getUsername(),
                ClientType.CLIENT,
                dayRange[0],
                dayRange[1]);
        applyClientReliquatDeduction(credits);
        return credits;
    }

    public Map<String, List<DailyUnrecoveredCreditDto>> getCreditByCollectorV2() {
        Map<String, List<DailyUnrecoveredCreditDto>> grouped = new LinkedHashMap<>();
        for (DailyUnrecoveredCreditDto credit : getCreditByCollector()) {
            if (credit.getClientQuarter() != null) {
                grouped.computeIfAbsent(credit.getClientQuarter(), k -> new ArrayList<>())
                        .add(credit);
            }
        }
        return grouped;
    }

    public Page<CreditRespDto> getCreditByCollectors(String collector, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by("id").descending());

        Page<CreditRespDto> creditsPage = saleSearchQueryRepository.findCreditsDto(
                collector, CreditStatus.INPROGRESS, OperationType.CREDIT, State.ENABLED, pageable);

        List<Long> creditIds = creditsPage.getContent().stream()
                .map(CreditRespDto::id)
                .toList();

        if (creditIds.isEmpty()) {
            return creditsPage;
        }

        Set<CreditArticles> allArticles = creditArticlesService.getRepository().findByCreditIds(creditIds);
        Map<Long, Set<CreditArticles>> articlesByCreditId = allArticles.stream()
                .collect(Collectors.groupingBy(ca -> ca.getCredit().getId(), Collectors.toSet()));

        List<CreditRespDto> contentWithArticles = creditsPage.getContent().stream()
                .map(credit -> credit.addArticles(articlesByCreditId.getOrDefault(credit.id(), Collections.emptySet())))
                .toList();

        return new PageImpl<>(contentWithArticles, pageable, creditsPage.getTotalElements());
    }

    public Page<CreditRespDto> getCreditHistoryByCollectors(String collector, Pageable pageable) {
        return saleSearchQueryRepository.findByStatusAndCollectorAndClientTypeOrderByClient_quarterAsc(
                CreditStatus.SETTLED, collector, ClientType.CLIENT, pageable);
    }

    public Page<CreditRespDto> getAll(Pageable pageable, String searchTerm) {
        User user = userService.getCurrentUser();
        String collector = null;
        if (user.is(UserProfilConstant.PROMOTER)) {
            collector = user.getUsername();
        }

        String effectiveSearchTerm = (searchTerm != null && !searchTerm.trim().isEmpty()) ? searchTerm : null;
        if (Objects.nonNull(effectiveSearchTerm)) {
            return saleSearchQueryRepository.findCreditsDtoWithSearch(
                    effectiveSearchTerm, collector, null, OperationType.CREDIT, State.ENABLED, pageable);
        }
        return saleSearchQueryRepository.findCreditsDto(
                collector, null, OperationType.CREDIT, State.ENABLED, pageable);
    }

    public Page<Credit> getAllValidatedCredit(String collector, Pageable pageable) {
        if (StringUtils.hasText(collector)) {
            return saleSearchQueryRepository.findByStatusAndClientTypeAndCollector(
                    CreditStatus.VALIDATED, ClientType.PROMOTER, collector, pageable);
        }
        return saleSearchQueryRepository.findByStatus(CreditStatus.VALIDATED, pageable);
    }

    public Page<Credit> getCreditHistories(Pageable pageable) {
        return saleSearchQueryRepository.findByStatusInAndClientType(
                List.of(CreditStatus.INPROGRESS, CreditStatus.DELIVERED, CreditStatus.ENDED, CreditStatus.SETTLED),
                ClientType.PROMOTER, pageable);
    }

    public ClientDetails getClientDetails(Long clientId) {
        Client client = clientService.getById(clientId);
        ClientDetails clientDetails = new ClientDetails();
        clientDetails.setName(client.getFullName());
        clientDetails.setPhone(client.getPhone());
        clientDetails.setOccupation(client.getOccupation());
        clientDetails.setAddress(client.getAddress());
        clientDetails.setAccountNumber(
                Objects.nonNull(client.getAccount()) ? client.getAccount().getAccountNumber() : null);
        clientDetails.setCollector(client.getCollector());
        clientDetails.setTotalInProgressCredit(creditRepository.countCreditsByClientId(clientId, CreditStatus.INPROGRESS));
        clientDetails.setTotalCreditClosed(creditRepository.countByStatusAndClient_id(CreditStatus.SETTLED, clientId));
        clientDetails.setTotalCreditDelayed(creditRepository.countByStatusAndClient_idAndSolvencyNote(
                CreditStatus.INPROGRESS, clientId, SolvencyStatus.LATE));
        Double totalInProgressCreditAmount = creditRepository.getTotalInProgressAmountByClientId(
                clientId, CreditStatus.INPROGRESS);
        Double totalInProgressAmountCollected = creditRepository.getTotalInProgressAmountPaidByClientId(
                clientId, CreditStatus.INPROGRESS);
        Double totalInProgressAmountDue = creditRecoveryQueryRepository.getTotalAmountDueTodayByClientId(clientId);
        clientDetails.setTotalInProgressCreditAmount(Objects.requireNonNullElse(totalInProgressCreditAmount, 0.0));
        clientDetails.setTotalInProgressAmountCollected(Objects.requireNonNullElse(totalInProgressAmountCollected, 0.0));
        clientDetails.setTotalInProgressAmountDue(Objects.requireNonNullElse(totalInProgressAmountDue, 0.0));
        clientDetails.setTotalAmountRemaining(
                clientDetails.getTotalInProgressCreditAmount() - clientDetails.getTotalInProgressAmountCollected());
        return clientDetails;
    }

    public Page<Credit> getCreditsByClientAndStatus(Long clientId, CreditStatus status, Pageable pageable) {
        return saleSearchQueryRepository.findByClient_idAndStatus(clientId, status, pageable);
    }

    public Page<Credit> getCreditsByClientAndStatusIn(Long clientId, List<CreditStatus> statuses, Pageable pageable) {
        return saleSearchQueryRepository.findByClient_idAndStatusIn(clientId, statuses, pageable);
    }

    public Page<CreditTimelineRespDto> getTimelines(Long creditId, Pageable pageable) {
        return creditTimelineRepository.findRespDtosByCreditIdAndState(creditId, State.ENABLED, pageable);
    }

    public Page<CreditTimeline> getTimelinesByClient(Long clientId, Pageable pageable) {
        return creditTimelineRepository.findByCredit_Client_Id(clientId, pageable);
    }

    public Page<CreditRespDto> getDelayedCreditsByCommercial(String commercial, Pageable pageable) {
        return CreditRespDto.fromCreditPage(creditRecoveryQueryRepository.getDelayedCredits(commercial, pageable));
    }

    public Page<CreditRespDto> getEndingCreditsByCommercial(String commercial, Pageable pageable) {
        return CreditRespDto.fromCreditPage(creditRecoveryQueryRepository.getEndingCredits(commercial, pageable));
    }

    public List<StockOutput> getCommercialStockOutput(String commercialUsername) {
        List<StockOutput> stock = saleSearchQueryRepository.findActiveCommercialCredits(commercialUsername);
        return stock.stream()
                .map(stockOutput -> stockOutput
                        .addItems(saleSearchQueryRepository.findStockOutputItemsByCreditId(stockOutput.id())))
                .toList();
    }

    public Credit getByIdWithSourceStocks(Long id) {
        Credit credit = creditRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
        enrichSourceMonthlyStocks(credit);
        enrichClientReliquat(credit);
        return credit;
    }

    public Double getClientReliquatAmount(Long creditId) {
        Credit credit = creditRepository.findById(creditId)
                .orElseThrow(() -> new ResourceNotFoundException("resource.not.found"));
        Long clientId = credit.getClientId();
        if (clientId == null || clientReliquatRepository == null) {
            return 0.0;
        }
        return clientReliquatRepository.findByClientId(clientId)
                .map(r -> r.getTotalAmount() != null ? r.getTotalAmount() : 0.0)
                .orElse(0.0);
    }

    private void applyClientReliquatDeduction(List<DailyUnrecoveredCreditDto> credits) {
        ClientReliquatNetRemaining.applyToDailyCredits(clientReliquatRepository, credits);
    }

    private LocalDateTime[] getCurrentAccountingDayRange() {
        LocalDate accountingDate = LocalDate.now();
        return new LocalDateTime[] {
                accountingDate.atStartOfDay(),
                accountingDate.plusDays(1).atStartOfDay()
        };
    }

    private void enrichClientReliquat(Credit credit) {
        if (credit == null || clientReliquatRepository == null) {
            return;
        }
        Long clientId = credit.getClientId();
        if (clientId == null) {
            credit.setClientReliquatAmount(0.0);
            return;
        }
        double amount = clientReliquatRepository.findByClientId(clientId)
                .map(r -> r.getTotalAmount() != null ? r.getTotalAmount() : 0.0)
                .orElse(0.0);
        credit.setClientReliquatAmount(amount);
    }

    private void enrichSourceMonthlyStocks(Credit credit) {
        if (credit.getArticles() == null || credit.getArticles().isEmpty()) {
            credit.setSourceMonthlyStocks(List.of());
            return;
        }

        Set<Long> stockItemIds = credit.getArticles().stream()
                .map(CreditArticles::getStockItemId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (stockItemIds.isEmpty() || commercialMonthlyStockItemRepository == null) {
            credit.setSourceMonthlyStocks(List.of());
            return;
        }

        List<CreditSourceMonthlyStockDto> sourceStocks = commercialMonthlyStockItemRepository
                .findAllByIdInWithMonthlyStock(stockItemIds)
                .stream()
                .map(CommercialMonthlyStockItem::getMonthlyStock)
                .filter(Objects::nonNull)
                .map(stock -> new CreditSourceMonthlyStockDto(
                        stock.getId(),
                        stock.getCollector(),
                        stock.getMonth(),
                        stock.getYear()))
                .distinct()
                .toList();

        credit.setSourceMonthlyStocks(sourceStocks);
    }
}
