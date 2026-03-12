package com.optimize.elykia.core.service.sale;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.common.securities.service.ParameterService;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.*;
import com.optimize.elykia.core.entity.*;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.enumaration.SolvencyStatus;
import com.optimize.elykia.core.mapper.CreditMapper;
import com.optimize.elykia.core.repository.*;
import com.optimize.elykia.core.repository.spec.CreditSpecification;
import com.optimize.elykia.core.service.store.ArticlesService;
import com.optimize.elykia.core.service.util.SharedService;
import com.optimize.elykia.core.service.accounting.DailyAccountancyService;
import com.optimize.elykia.core.service.bi.BiAggregationService;
import com.optimize.elykia.core.service.stock.StockMovementService;
import com.optimize.elykia.core.service.tontine.TontineService;
import com.optimize.elykia.core.service.tontine.TontineStockService;
import com.optimize.elykia.core.util.UserProfilConstant;
import lombok.SneakyThrows;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

import com.optimize.elykia.core.mapper.CreditDistributionMapper;
import com.optimize.elykia.core.dto.BulkChangeCollectorDto;

@Transactional
@Service
public class CreditService extends GenericService<Credit, Long> {
    private final CreditMapper creditMapper;
    private final ClientService clientService;
    private final UserService userService;
    @Value(value = "${app.credit.dividend}")
    private Integer dividend;
    private final ArticlesService articlesService;
    private final CreditArticlesService creditArticlesService;
    private final DailyAccountancyService dailyAccountancyService;
    private final CreditReturnHistoryService creditReturnHistoryService;
    private CreditTimelineRepository creditTimelineRepository;
    private SharedService sharedService;
    private final CommercialMonthlyStockRepository commercialMonthlyStockRepository;
    private final CreditCollectorHistoryRepository creditCollectorHistoryRepository;
    private CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository;

    // Services BI pour enrichissement automatique
    private CreditEnrichmentService creditEnrichmentService;
    private CreditPaymentEventService creditPaymentEventService;
    private StockMovementService stockMovementService;
    private BiAggregationService biAggregationService; // Added for real-time aggregation
    private final CreditDistributionViewRepository creditDistributionViewRepository;
    private final CreditDistributionMapper creditDistributionMapper;
    private TontineStockService tontineStockService;
    private TontineService tontineService;
    private ParameterService parameterService;

    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    @Autowired
    private CreditTimelineService creditTimelineService;

    protected CreditService(CreditRepository repository,
            CreditMapper creditMapper,
            ClientService clientService,
            ArticlesService articlesService,
            CreditArticlesService creditArticlesService,
            UserService userService,
            DailyAccountancyService dailyAccountancyService,
            CreditReturnHistoryService creditReturnHistoryService,
            CreditDistributionViewRepository creditDistributionViewRepository,
            CreditDistributionMapper creditDistributionMapper,
            CommercialMonthlyStockRepository commercialMonthlyStockRepository,
            com.optimize.elykia.core.repository.CreditCollectorHistoryRepository creditCollectorHistoryRepository,
            org.springframework.context.ApplicationEventPublisher eventPublisher) {
        super(repository);
        this.creditMapper = creditMapper;
        this.clientService = clientService;
        this.articlesService = articlesService;
        this.creditArticlesService = creditArticlesService;
        this.userService = userService;
        this.dailyAccountancyService = dailyAccountancyService;
        this.creditReturnHistoryService = creditReturnHistoryService;
        this.creditDistributionViewRepository = creditDistributionViewRepository;
        this.creditDistributionMapper = creditDistributionMapper;
        this.commercialMonthlyStockRepository = commercialMonthlyStockRepository;
        this.creditCollectorHistoryRepository = creditCollectorHistoryRepository;
        this.eventPublisher = eventPublisher;
    }

    @Autowired
    public void setCreditEnrichmentService(CreditEnrichmentService creditEnrichmentService) {
        this.creditEnrichmentService = creditEnrichmentService;
    }

    @Autowired
    public void setCreditPaymentEventService(CreditPaymentEventService creditPaymentEventService) {
        this.creditPaymentEventService = creditPaymentEventService;
    }

    @Autowired
    public void setStockMovementService(StockMovementService stockMovementService) {
        this.stockMovementService = stockMovementService;
    }

    @Autowired
    public void setBiAggregationService(BiAggregationService biAggregationService) {
        this.biAggregationService = biAggregationService;
    }

    @Transactional
    public CreditRespDto createCredit(CreditDto creditDto) throws Exception {
        if (Objects.nonNull(creditDto.getType()) && OperationType.CASH.equals(creditDto.getType())) {
            return createCashSale(creditDto);
        }
        Credit credit = creditMapper.toEntity(creditDto);
        creditControlProcess(credit);

        if (ClientType.CLIENT.equals(credit.getClientType())
                && getRepository().hasCreditInProgress(credit.getClientId())) {
            throw new CustomValidationException("Le client " + credit.getClient().getFullName()
                    + " possède déjà une vente en cours et ne peut donc pas bénéficier d'une autre vente !");
        }

        return createAndProcessCredit(credit, creditDto.getClientId());
    }

    @SneakyThrows
    @Transactional
    public Long transformOrderToCredit(Order order) {
        DistributeArticleDto distributeArticleDto = DistributeArticleDto.fromOrder(order);
        CreditRespDto credit = distributeArticlesV2(distributeArticleDto);
        return credit.id();
    }

    @Transactional
    public CreditRespDto createCashSale(CreditDto creditDto) {
        Credit credit = creditMapper.toEntity(creditDto);
        Client client = clientService.getById(credit.getClientId());

        credit.setClient(client);
        if (StringUtils.hasText(client.getAgencyCollector())) {
            credit.setAgencyCommercial(client.getAgencyCollector());
            credit.setCollector(client.getAgencyCollector());
        } else {
            credit.setCollector(client.getCollector());
        }
        credit.setClientType(ClientType.CLIENT);
        credit.setType(OperationType.CASH);

        if (!StringUtils.hasText(credit.getReference())) {
            String ref = generateReference(client.getId().toString(), credit.getClientType());
            credit.setReference("CSH-" + ref);
        }

        if (Objects.isNull(credit.getId())) {
            credit.getArticles().forEach(article -> {
                article.setArticles(articlesService.getById(article.getArticlesId()));
                article.setUnitPrice(article.getArticles().getSellingPrice());
            });
        }

        credit.setTotalAmount(credit.getTotalAmountByCalcul());
        credit.setAdvance(0.0);
        credit.setTotalAmountPaid(credit.getTotalAmount());
        credit.setTotalAmountRemaining(0.0);
        credit.setDailyStake(0.0);
        credit.setRemainingDaysCount(0);
        credit.setBeginDate(LocalDate.now());
        credit.setExpectedEndDate(LocalDate.now());
        credit.setEffectiveEndDate(LocalDate.now());
        credit.setStatus(CreditStatus.VALIDATED);
        credit.setUpdatable(true);

        credit = this.create(credit);
        credit.setCreditToCreditArticles();
        credit.getArticles().forEach(creditArticlesService::create);
        filledRecovery(credit);
        return CreditRespDto.fromCredit(creditEnrichment(credit));
    }

    private void filledRecovery(Credit credit) {
        var timeline = new CreditTimelineDto();
        timeline.setCreditId(credit.getId());
        timeline.setCollector(credit.getCollector());
        timeline.setAmount(credit.getTotalAmount());
        timeline.setNormalStake(Boolean.FALSE);
        creditTimelineService.makeDailyStake(timeline);
    }

    @Transactional
    public CreditRespDto createTontineCredit(TontineDelivery delivery) {
        Credit credit = Credit.buildFromDelivery(delivery);
        String baseReference = generateReference(
                String.valueOf(delivery.getTontineMember().getClient().getId()),
                ClientType.CLIENT);
        credit.setReference("T" + baseReference);
        return this.createTontine(credit);

    }

    @Transactional
    public CreditRespDto createTontine(Credit credit) {
        tontineStockService
                .checkAvailabilityAndUpdateTontineStock(
                        credit.getArticles(),
                        credit.getCollector());
        credit = this.create(credit);
        // Save CreditArticles
        credit.setCreditToCreditArticles(); // Ensure relationship is set
        credit.getArticles().forEach(creditArticlesService::create);
        this.startCredit(credit.getId(), Boolean.TRUE);
        filledRecovery(credit);
        return CreditRespDto.fromCredit(credit);
    }

    public void creditUnicity(Credit credit) {

        if (ClientType.CLIENT.equals(credit.getClientType())
                && getRepository().hasCreditInProgress(credit.getClientId())) {
            throw new CustomValidationException("Le client " + credit.getClient().getFullName()
                    + " possède déjà une vente en cours et ne peut donc pas bénéficier d'une autre vente !");
        }
    }

    private CreditRespDto createAndProcessCredit(Credit credit, Long clientId) {
        credit = this.create(credit);
        credit.setCreditToCreditArticles();
        credit.getArticles().forEach(creditArticlesService::create);
        clientService.updateCreditStatus(clientId, Boolean.TRUE);

        // Enrichissement BI automatique
        if (creditEnrichmentService != null) {
            creditEnrichmentService.enrichCredit(credit);
            credit = update(credit);
        }

        return CreditRespDto.fromCredit(creditEnrichment(credit));
    }

    public Credit creditEnrichment(Credit credit) {
        if (creditEnrichmentService != null) {
            creditEnrichmentService.enrichCredit(credit);
            return update(credit);
        }
        return credit;
    }

    @Transactional
    public CreditRespDto updateCredit(CreditDto creditDto, Long id) {
        creditDto.setId(id);
        final Credit oldOne = getById(id);

        if (OperationType.CASH.equals(oldOne.getType())) {
            return updateCashSale(creditDto, id);
        }

        Credit credit = creditMapper.toEntity(creditDto);
        if (!List.of(CreditStatus.CREATED, CreditStatus.VALIDATED).contains(oldOne.getStatus())) {
            throw new CustomValidationException("Cette vente ne peut plus être modifier à ce stade !");
        }
        creditControlProcess(credit);
        oldOne.getArticles().forEach(creditArticlesService::delete);
        credit.setStatus(CreditStatus.CREATED);
        credit.setTotalAmountPaid(oldOne.getTotalAmountPaid());
        credit.setAdvance(oldOne.getAdvance());
        credit.setBeginDate(oldOne.getBeginDate());
        credit.checkAdvance();
        credit.setParent(oldOne.getParent());
        credit.setUpdatable(oldOne.getUpdatable());
        credit.setAccountingDate(oldOne.getAccountingDate());
        credit.setReleaseDate(oldOne.getReleaseDate());
        credit.setDailyPaid(oldOne.getDailyPaid());
        credit.setClientType(oldOne.getClientType());
        credit = update(credit);
        credit.setCreditToCreditArticles();
        credit.getArticles().forEach(creditArticlesService::create);
        return CreditRespDto.fromCredit(credit);
    }

    @Transactional
    public CreditRespDto updateCashSale(CreditDto creditDto, Long id) {
        creditDto.setId(id);
        Credit credit = creditMapper.toEntity(creditDto);
        final Credit oldOne = getById(id);

        if (!CreditStatus.VALIDATED.equals(oldOne.getStatus())) {
            throw new CustomValidationException("Cette vente au comptant ne peut plus être modifiée !");
        }

        if (!OperationType.CASH.equals(oldOne.getType())) {
            throw new CustomValidationException("Cette méthode ne permet de modifier que les ventes au comptant !");
        }

        Client client = clientService.getById(credit.getClientId());
        credit.setClient(client);
        if (StringUtils.hasText(client.getAgencyCollector())) {
            credit.setAgencyCommercial(client.getAgencyCollector());
            credit.setCollector(client.getAgencyCollector());
        } else {
            credit.setCollector(client.getCollector());
        }

        credit.setClientType(ClientType.CLIENT);
        credit.setType(OperationType.CASH);

        if (!StringUtils.hasText(credit.getReference())) {
            credit.setReference(oldOne.getReference());
        }

        credit.getArticles().forEach(article -> {
            article.setArticles(articlesService.getById(article.getArticlesId()));
            article.setUnitPrice(article.getArticles().getSellingPrice());
        });

        credit.setTotalAmount(credit.getTotalAmountByCalcul());
        credit.setTotalAmountPaid(credit.getTotalAmount());
        credit.setTotalAmountRemaining(0.0);
        credit.setAdvance(0.0);
        credit.setDailyStake(0.0);
        credit.setRemainingDaysCount(0);

        if (credit.getBeginDate() == null) {
            credit.setBeginDate(oldOne.getBeginDate());
        }
        credit.setExpectedEndDate(credit.getBeginDate());
        credit.setEffectiveEndDate(credit.getBeginDate());

        credit.setStatus(CreditStatus.VALIDATED);
        credit.setUpdatable(true);

        oldOne.getArticles().forEach(creditArticlesService::delete);

        credit = update(credit);
        credit.setCreditToCreditArticles();
        credit.getArticles().forEach(creditArticlesService::create);

        return CreditRespDto.fromCredit(creditEnrichment(credit));
    }

    public void creditControlProcess(Credit credit) {
        Client client = clientService.getById(credit.getClientId());
        credit.setCollector(client.getCollector());
        LocalDate now =  LocalDate.now();

        if (Objects.isNull(credit.getId())) {
            credit.getArticles().forEach(article -> {
                Articles oneArticle = articlesService.getById(article.getArticlesId());
                article.setArticles(oneArticle);
                if (OperationType.CREDIT.equals(credit.getType()) && ClientType.CLIENT.equals(credit.getClientType())) {

                    Double unitPrice = commercialMonthlyStockItemRepository
                            .getUnitPriceByArticleId(oneArticle.getId(), now.getMonthValue(), now.getYear(), credit.getCollector());
                    unitPrice = Objects.nonNull(unitPrice) ? unitPrice : oneArticle.getCreditSalePrice();
                    article.setUnitPrice(unitPrice);

                    Long stockItemId = commercialMonthlyStockItemRepository
                            .getIdByArticleId(oneArticle.getId(), now.getMonthValue(), now.getYear(), credit.getCollector());
                    article.setStockItemId(stockItemId);

                }else {
                    article.setUnitPrice(article.getArticles().getCreditSalePrice());
                }

            });
        } else {
            Credit oldOne = getById(credit.getId());
            Set<CreditArticles> creditArticles = new HashSet<>();
            for (CreditArticles newOne : credit.getArticles()) {
                for (CreditArticles existingOne : oldOne.getArticles()) {
                    if (newOne.getArticlesId().equals(existingOne.getArticlesId())) {
                        newOne.setUnitPrice(existingOne.getUnitPrice());
                        newOne.setId(existingOne.getId());
                        newOne.setArticles(existingOne.getArticles());
                    }
                }
                if (Objects.isNull(newOne.getId())) {
                    newOne.setArticles(articlesService.getById(newOne.getArticlesId()));
                    newOne.setUnitPrice(newOne.getArticles().getCreditSalePrice());
                }
                creditArticles.add(newOne);
            }
            credit.setArticles(creditArticles);
        }

        credit.setUp();
        if (parameterService.isEnabled("ENABLED_ACCOUNT_BALANCE_CONTROL")) {
            client.hasValidAccount();
            client.allowCreditAmountControl(credit.getTotalAmount(), dividend);
        }

        credit.setClient(client);
        credit.setType(OperationType.CREDIT);

        credit.checkAdvance();
        credit.setClientType(Objects.nonNull(client.getClientType()) ? client.getClientType() : ClientType.CLIENT);
        if (!StringUtils.hasText(credit.getReference())) {
            credit.setReference(generateReference(client.getId().toString(), credit.getClientType()));
        }

    }

    public boolean changeDailyStake(ChangeDailyStakeDto dto) {
        Credit credit = getById(dto.creditId());
        credit.changeDailyStake(dto.dailyStake());
        repository.saveAndFlush(credit);
        return Boolean.TRUE;
    }

    @Transactional
    public CreditRespDto distributeArticlesV2(DistributeArticleDto dto) {
        dto.validateEntryArticles();
        // Dans la V2, on ne dépend plus d'un crédit parent (sortie stock)
        // On vérifie directement le stock mensuel du commercial

        Client client = clientService.getById(dto.getClientId());
        if (ClientType.PROMOTER.equals(client.getClientType())) {
            throw new CustomValidationException("Opération non disponible pour ce type de client !");
        }

        String collector = client.getCollector();
        LocalDate now = LocalDate.now();

        // Récupérer le stock mensuel du commercial
        CommercialMonthlyStock monthlyStock = commercialMonthlyStockRepository
                .findByCollectorAndMonthAndYear(collector, now.getMonthValue(), now.getYear())
                .orElseThrow(() -> new CustomValidationException("Aucun stock trouvé pour ce commercial ce mois-ci."));

        Credit clientCredit = new Credit();
        clientCredit.setClient(client);
        clientCredit.setArticles(CreditArticles.from(dto.getArticles()));
        // Pas de parent dans la V2 car on décorrèle de la sortie stock spécifique
        clientCredit.setParent(null);

        clientCredit.setCreditToCreditArticles();
        clientCredit.setAdvance(dto.getAdvance());

        creditControlProcess(clientCredit);
        creditUnicity(clientCredit);

        // Vérification et mise à jour du stock commercial
        clientCredit.getArticles().forEach(creditArticles -> {
            CommercialMonthlyStockItem stockItem = monthlyStock.getItems().stream()
                    .filter(item -> item.getArticle().getId().equals(creditArticles.getArticlesId()))
                    .findFirst()
                    .orElseThrow(() -> new CustomValidationException("Article non trouvé dans le stock du commercial : "
                            + creditArticles.getArticles().getCommercialName()));

            if (stockItem.getQuantityRemaining() < creditArticles.getQuantity()) {
                throw new CustomValidationException("Stock insuffisant chez le commercial pour l'article : "
                        + creditArticles.getArticles().getCommercialName());
            }

            // Mise à jour des compteurs et de la valeur financière vendue exacte
            stockItem.setQuantitySold(stockItem.getQuantitySold() + creditArticles.getQuantity());
            double currentTotalSold = stockItem.getTotalSoldValue() == null ? 0.0 : stockItem.getTotalSoldValue();
            double currentTotalMarge = Objects.isNull(stockItem.getTotalMargeValue()) ? 0.0 : stockItem.getTotalMargeValue();
            Double currentPMP = stockItem.getWeightedAverageUnitPrice() == null ? 0.0
                    : stockItem.getWeightedAverageUnitPrice();
            stockItem.setTotalSoldValue(currentTotalSold + (creditArticles.getQuantity() * currentPMP));
            stockItem.setTotalMargeValue(currentTotalMarge + (creditArticles.getQuantity() * stockItem.getWeightedAveragePurchasePrice()));
            stockItem.updateRemaining();
            
            // Set stockItemId in CreditArticles
            creditArticles.setStockItemId(stockItem.getId());
        });

        // Sauvegarde du stock mis à jour
        commercialMonthlyStockRepository.save(monthlyStock);

        // Configuration finale du crédit
        if (Objects.nonNull(dto.getMobile()) && dto.getMobile()) {
            clientCredit.setTotalAmount(dto.getTotalAmount());
            clientCredit.setDailyStake(dto.getDailyStake());
            clientCredit.setTotalAmountRemaining(dto.getTotalAmount() - dto.getAdvance());
            clientCredit.setTotalAmountPaid(dto.getAdvance());
            clientCredit.setBeginDate(dto.getStartDate());
            clientCredit.setRemainingDaysCount(
                    (int) Math.ceil(clientCredit.getTotalAmountRemaining() / clientCredit.getDailyStake()));
            clientCredit.setExpectedEndDate(now.plusDays(clientCredit.getRemainingDaysCount()));
        }

        if (StringUtils.hasText(dto.getReference())) {
            if (getRepository().existsByReference(dto.getReference())) {
                return CreditRespDto.fromCredit(getRepository().findByReference(dto.getReference()).orElseThrow());
            }
            clientCredit.setReference(dto.getReference());
        }

        repository.saveAndFlush(clientCredit);

        // Mettre à jour le statut du client
        clientService.updateCreditStatus(client.getId(), Boolean.TRUE);
        validateCredit(clientCredit.getId());
        startCredit(clientCredit.getId(), Boolean.TRUE);

        return CreditRespDto.fromCredit(clientCredit);
    }

    // Total avance par commercial
    @Deprecated
    public Double getTotalAdvanceForCommercial(String commercialUsername) {
        Double total = getRepository().getTotalAdvanceByCommercial(
                commercialUsername,
                ClientType.CLIENT,
                CreditStatus.INPROGRESS);
        return total != null ? total : 0.0;
    }

    // Total de vente non distribuer par le commercial
    @Deprecated
    public Double getTotalNotDistributedForCommercial(String commercialUsername) {
        Double total = getRepository().getTotalNotDistributedAmountByCommercial(
                commercialUsername);
        return total != null ? total : 0.0;
    }


    @Deprecated
    public Double getTotalDisbursedAmountForPeriod(LocalDate startDate, LocalDate endDate) {
        List<CreditStatus> disbursedStatuses = List.of(CreditStatus.INPROGRESS, CreditStatus.DELIVERED,
                CreditStatus.ENDED, CreditStatus.SETTLED);

        Double totalAmount = getRepository().sumTotalAmountByBeginDateBetweenAndStatusInAndState(
                startDate,
                endDate,
                disbursedStatuses,
                State.ENABLED,
                ClientType.PROMOTER);

        return totalAmount == null ? 0.0 : totalAmount;
    }

    @Deprecated
    public CommercialDetails getCommercialDetails(Long id) {
        User user = userService.getById(id);
        String username = user.getUsername();
        CommercialDetails commercialDetails = new CommercialDetails();
        Double totalNonDistributed = this.getTotalNotDistributedForCommercial(username);
        commercialDetails.setName(user.getFirstname() + " " + user.getLastname());
        commercialDetails.setPhone(user.getPhone());
        commercialDetails
                .setTotalClient(getRepository().getTotalClientByCommercial(user.getUsername(), ClientType.CLIENT));
        commercialDetails.setTotalCreditClosed(getRepository()
                .countByStatusAndCollectorAndClientType(CreditStatus.SETTLED, user.getUsername(), ClientType.CLIENT));
        commercialDetails.setTotalCreditDelayed(getRepository().countByStatusAndCollectorAndClientTypeAndSolvencyNote(
                CreditStatus.INPROGRESS, user.getUsername(), ClientType.CLIENT, SolvencyStatus.LATE));
        commercialDetails.setTotalInProgressCredit(getRepository().countByStatusAndCollectorAndClientType(
                CreditStatus.INPROGRESS, user.getUsername(), ClientType.CLIENT));
        commercialDetails.setTotalAmountCollected(getRepository().getTotalInProgressAmountPaidByCommercial(
                user.getUsername(), ClientType.CLIENT, CreditStatus.INPROGRESS));
        commercialDetails.setTotalAmountDue(getRepository().getTotalAmountDueTodayByCommercial(user.getUsername()));
        commercialDetails.setTotalInProgressCreditAmount(getRepository().getTotalInProgressAmountByCommercial(
                user.getUsername(), ClientType.CLIENT, ClientType.PROMOTER, CreditStatus.INPROGRESS, State.ENABLED));
        commercialDetails.setTotalInProgressRemainingAmount(
                getRepository().getTotalInProgressRemainingAmountByCommercial(user.getUsername(), ClientType.CLIENT,
                        ClientType.PROMOTER, CreditStatus.INPROGRESS, State.ENABLED));
        // On remplit les nouveaux champs en appelant les méthodes que nous venons de
        // créer
        commercialDetails.setTotalAdvance(this.getTotalAdvanceForCommercial(username));
        commercialDetails.setTotalNotDistributed(totalNonDistributed);

        return commercialDetails;
    }

    @Transactional
    public Boolean validateCredit(Long creditId) {
        Credit credit = getById(creditId);
        credit.validate();
        repository.saveAndFlush(credit);
        return Boolean.TRUE;
    }

    @Transactional
    public Boolean startCredit(Long creditId, Boolean distribution) {
        Credit credit = getById(creditId);
        List<String> articleOutOfStock = new ArrayList<>();
        if (Boolean.FALSE.equals(distribution) && !OperationType.TONTINE.equals(credit.getType())) {
            credit.getArticles().forEach(article -> {
                if (!article.hasStockAvailable()) {
                    articleOutOfStock.add(article.getArticles().getCommercialName());
                }
            });

            if (!articleOutOfStock.isEmpty()) {
                throw new CustomValidationException("Stock manquant pour démarrer le crédit: Articles Manquants: "
                        + String.join("; \n", articleOutOfStock));
            }

            // Enregistrement des mouvements de stock
            if (stockMovementService != null && credit.getArticles() != null) {
                final Credit finalCredit = credit;
                credit.getArticles().forEach(creditArticle -> {
                    articlesService.makeStockRelease(creditArticle);
                    stockMovementService.recordMovement(
                            creditArticle.getArticles(),
                            com.optimize.elykia.core.enumaration.MovementType.RELEASE,
                            creditArticle.getQuantity(),
                            "Vente crédit #" + finalCredit.getId(),
                            finalCredit.getCollector(),
                            finalCredit);
                });
            }

            // Gestion du stock commercial pour les ventes CASH
            if (OperationType.CASH.equals(credit.getType())) {
                final Credit cashCredit = credit;
                LocalDate now = LocalDate.now();

                // Utiliser agencyCommercial s'il est défini, sinon le collector du crédit
                String commercialUsername = StringUtils.hasText(cashCredit.getAgencyCommercial())
                        ? cashCredit.getAgencyCommercial()
                        : cashCredit.getCollector();

                CommercialMonthlyStock monthlyStock = commercialMonthlyStockRepository
                        .findByCollectorAndMonthAndYear(commercialUsername, now.getMonthValue(), now.getYear())
                        .orElseGet(() -> {
                            CommercialMonthlyStock newStock = new CommercialMonthlyStock();
                            newStock.setCollector(commercialUsername);
                            newStock.setMonth(now.getMonthValue());
                            newStock.setYear(now.getYear());
                            return commercialMonthlyStockRepository.save(newStock);
                        });

                cashCredit.getArticles().forEach(creditArticle -> {
                    CommercialMonthlyStockItem stockItem = monthlyStock.getItems().stream()
                            .filter(item -> item.getArticle().getId().equals(creditArticle.getArticlesId()))
                            .findFirst()
                            .orElseGet(() -> {
                                CommercialMonthlyStockItem newItem = new CommercialMonthlyStockItem();
                                newItem.setArticle(creditArticle.getArticles());
                                newItem.setMonthlyStock(monthlyStock);
                                monthlyStock.addItem(newItem);
                                return newItem;
                            });

                    // Pour une vente CASH, on considère que c'est pris du stock ET vendu
                    stockItem.setQuantityTaken(stockItem.getQuantityTaken() + creditArticle.getQuantity());
                    stockItem.setQuantitySold(stockItem.getQuantitySold() + creditArticle.getQuantity());
                    double currentTotalSold = stockItem.getTotalSoldValue() == null ? 0.0
                            : stockItem.getTotalSoldValue();
                    Double currentPMP = stockItem.getWeightedAverageUnitPrice() == null ? 0.0
                            : stockItem.getWeightedAverageUnitPrice();
                    stockItem.setTotalSoldValue(currentTotalSold + (creditArticle.getQuantity() * currentPMP));
                    stockItem.updateRemaining();
                });
                commercialMonthlyStockRepository.save(monthlyStock);
            }

            // if (OperationType.TONTINE.equals(credit.getType())) {
            // credit = mergeTontine(credit);
            // }
        }
        LocalDate accountingDate = LocalDate.now();
        credit.setAccountingDate(accountingDate);
        credit.setReleaseDate(accountingDate);
        credit.start();
        repository.saveAndFlush(credit);

        // Calculate margin
        Double margin = (credit.getTotalAmount() != null ? credit.getTotalAmount() : 0.0) -
                (credit.getTotalPurchase() != null ? credit.getTotalPurchase() : 0.0);

        // Publish Event
        if (eventPublisher != null && !OperationType.TONTINE.equals(credit.getType())) {
            eventPublisher.publishEvent(new com.optimize.elykia.core.event.CreditStartedEvent(
                    this,
                    credit.getTotalAmount(),
                    credit.getCollector(), credit.getAdvance(), margin,
                    credit.getClient().getFullName(),
                    credit.getReference()));
        }

        // Real-time aggregation update for BI performance optimization
        if (biAggregationService != null) {
            try {
                biAggregationService.updateSalesAggregation(credit);
            } catch (Exception e) {
                e.printStackTrace();
                // Log error but don't fail the main credit operation
                // This ensures aggregation errors don't impact business operations
            }
        }

        return Boolean.TRUE;
    }

    public Credit getByClient(Long clientId, String collector) {
        return getRepository().findByClient_idAndCollectorAndStatus(clientId, collector, CreditStatus.INPROGRESS)
                .orElseThrow(() -> new ResourceNotFoundException("Crédit non trouvé pour le promoteur " + collector
                        + " avec l'identifiant du client " + clientId));
    }

    public Page<CreditRespDto> elasticsearch(String keyword, Pageable pageable) {
        return CreditRespDto.fromCreditPage(getRepository().elasticsearch(keyword, pageable));
    }

    public Page<CreditRespDto> getCreditByCollector(Pageable pageable) {
        User user = userService.getCurrentUser();
        if (user.is(UserProfilConstant.PROMOTER) && !dailyAccountancyService.isOpenCashDesk()) {
            throw new ApplicationException("Aucune caisse ouverte pour l'utilisateur " + user.getUsername());
        }
        return CreditRespDto.fromCreditPage(
                getRepository().findByStatusAndCollectorAndDailyPaidIsFalseAndClientTypeOrderByClient_quarterAsc(
                        CreditStatus.INPROGRESS, user.getUsername(), ClientType.CLIENT, pageable));
    }

    public Page<CreditRespDto> getCreditByCollectors(String collector, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by("id").descending());
        
        // 1. Récupérer les DTOs des crédits (sans articles)
        Page<CreditRespDto> creditsPage = getRepository().findCreditsDto(collector, CreditStatus.INPROGRESS, OperationType.CREDIT, State.ENABLED, pageable);

        // 2. Récupérer les IDs des crédits
        List<Long> creditIds = creditsPage.getContent().stream()
                .map(CreditRespDto::id)
                .toList();

        if (creditIds.isEmpty()) {
            return creditsPage;
        }

        // 3. Charger les articles en lot
        Set<CreditArticles> allArticles = creditArticlesService.getRepository().findByCreditIds(creditIds);

        // 4. Grouper les articles par creditId
        Map<Long, Set<CreditArticles>> articlesByCreditId = allArticles.stream()
                .collect(Collectors.groupingBy(ca -> ca.getCredit().getId(), Collectors.toSet()));

        // 5. Associer les articles aux DTOs
        List<CreditRespDto> contentWithArticles = creditsPage.getContent().stream()
                .map(credit -> credit.addArticles(articlesByCreditId.getOrDefault(credit.id(), Collections.emptySet())))
                .toList();

        return new PageImpl<>(contentWithArticles, pageable, creditsPage.getTotalElements());
    }

    public Page<CreditRespDto> getCreditHistoryByCollectors(String collector, Pageable pageable) {
        return getRepository().findByStatusAndCollectorAndClientTypeOrderByClient_quarterAsc(CreditStatus.SETTLED,
                collector, ClientType.CLIENT, pageable);
    }

    public List<Credit> getCreditByCollector() {
        User user = userService.getCurrentUser();
        if (!dailyAccountancyService.isOpenCashDesk()) {
            throw new ApplicationException("Aucune caisse ouverte pour l'utilisateur " + user.getUsername());
        }
        // filtre
        List<Credit> rawCredits = getRepository()
                .findByStatusAndCollectorAndDailyPaidIsFalseAndClientTypeOrderByClient_quarterAsc(
                        CreditStatus.INPROGRESS, user.getUsername(), ClientType.CLIENT);
        return rawCredits.stream()
                .filter(credit -> credit.getClient() != null)
                .collect(Collectors.toList());
    }

    public Map<String, List<Credit>> getCreditByCollectorV2() {
        Map<String, List<Credit>> grouped = new HashMap<>();
        for (Credit credit : getCreditByCollector()) {
            // On vérifie que le client et sa localité (quarter) ne sont pas nuls
            if (credit.getClient() != null && credit.getClient().getQuarter() != null) {
                grouped.computeIfAbsent(credit.getClient().getQuarter(), k -> new ArrayList<>())
                        .add(credit);
            }
        }
        return grouped;
    }

    public Page<CreditRespDto> getAll(Pageable pageable, String searchTerm) {
        User user = userService.getCurrentUser();
        String collector = null;
        if (user.is(UserProfilConstant.PROMOTER)) {
            collector = user.getUsername();
        }
        
        String effectiveSearchTerm = (searchTerm != null && !searchTerm.trim().isEmpty()) ? searchTerm : null;

        if (Objects.nonNull(effectiveSearchTerm)) {
            return getRepository().findCreditsDtoWithSearch(effectiveSearchTerm, collector, null, OperationType.CREDIT, State.ENABLED, pageable);
        } else {
            return getRepository().findCreditsDto(collector, null, OperationType.CREDIT, State.ENABLED, pageable);
        }
    }

    public Page<Credit> getAllValidatedCredit(String collector, Pageable pageable) {
        if (StringUtils.hasText(collector)) {
            return getRepository().findByStatusAndClientTypeAndCollector(CreditStatus.VALIDATED, ClientType.PROMOTER,
                    collector, pageable);
        }
        return getRepository().findByStatus(CreditStatus.VALIDATED, pageable);
    }

    public Page<Credit> getCreditHistories(Pageable pageable) {
        return getRepository().findByStatusInAndClientType(
                List.of(CreditStatus.INPROGRESS, CreditStatus.DELIVERED, CreditStatus.ENDED, CreditStatus.SETTLED),
                ClientType.PROMOTER, pageable);
    }


    @Override
    public CreditRepository getRepository() {
        return (CreditRepository) repository;
    }

    public ClientDetails getClientDetails(Long clientId) {
        Client client = clientService.getById(clientId);
        ClientDetails clientDetails = new ClientDetails();
        clientDetails.setName(client.getFullName());
        clientDetails.setPhone(client.getPhone());
        clientDetails.setOccupation(client.getOccupation());
        clientDetails.setAddress(client.getAddress());
        clientDetails
                .setAccountNumber(Objects.nonNull(client.getAccount()) ? client.getAccount().getAccountNumber() : null);
        clientDetails.setCollector(client.getCollector());
        clientDetails
                .setTotalInProgressCredit(getRepository().countCreditsByClientId(clientId, CreditStatus.INPROGRESS));
        clientDetails.setTotalCreditClosed(getRepository().countByStatusAndClient_id(CreditStatus.SETTLED, clientId));
        clientDetails.setTotalCreditDelayed(getRepository()
                .countByStatusAndClient_idAndSolvencyNote(CreditStatus.INPROGRESS, clientId, SolvencyStatus.LATE));
        clientDetails.setTotalInProgressCreditAmount(
                getRepository().getTotalInProgressAmountByClientId(clientId, CreditStatus.INPROGRESS));
        clientDetails.setTotalInProgressAmountCollected(
                getRepository().getTotalInProgressAmountPaidByClientId(clientId, CreditStatus.INPROGRESS));
        clientDetails.setTotalInProgressAmountDue(getRepository().getTotalAmountDueTodayByClientId(clientId));
        clientDetails.setTotalAmountRemaining(
                clientDetails.getTotalInProgressCreditAmount() - clientDetails.getTotalInProgressAmountCollected());
        return clientDetails;
    }

    public Page<Credit> getCreditsByClientAndStatus(Long clientId, CreditStatus status, Pageable pageable) {
        return getRepository().findByClient_idAndStatus(clientId, status, pageable);
    }

    public Page<Credit> getCreditsByClientAndStatusIn(Long clientId, List<CreditStatus> statuses, Pageable pageable) {
        return getRepository().findByClient_idAndStatusIn(clientId, statuses, pageable);
    }


    public String generateReference(String clientId, ClientType clientType) {
        String yy = "" + LocalDate.now().getYear();
        String initial = clientType.name().substring(0, 1);
        return initial + yy.substring(2) + clientId + RandomStringUtils.randomNumeric(4);
    }

    public Page<CreditTimeline> getTimelines(Long creditId, Pageable pageable) {
        return creditTimelineRepository.findByCredit_id(creditId, pageable);
    }

    public Page<CreditTimeline> getTimelinesByClient(Long clientId, Pageable pageable) {
        return creditTimelineRepository.findByCredit_Client_Id(clientId, pageable);
    }



    public Page<CreditRespDto> getDelayedCreditsByCommercial(String commercial, Pageable pageable) {
        return CreditRespDto.fromCreditPage(getRepository().getDelayedCredits(commercial, pageable));
    }

    public Page<CreditRespDto> getEndingCreditsByCommercial(String commercial, Pageable pageable) {
        return CreditRespDto.fromCreditPage(getRepository().getEndingCredits(commercial, pageable));
    }

    @Transactional
    @Override
    public boolean deleteSoft(Long id) throws ApplicationException {
        Credit credit = getById(id);
        boolean result = super.deleteSoft(id);
        if (result) {
            clientService.updateCreditStatus(credit.getClientId(), Boolean.FALSE);
        }
        return result;
    }

    public List<StockOutput> getCommercialStockOutput(String commercialUsername) {
        List<StockOutput> stock = getRepository().findActiveCommercialCredits(commercialUsername);
        return stock.stream()
                .map(stockOutput -> stockOutput
                        .addItems(getRepository().findStockOutputItemsByCreditId(stockOutput.id())))
                .toList();
    }

    public void updateReleasePrinted(LocalDate releaseDate) {
        getRepository().updateReleasePrinted(releaseDate);
    }

    @Autowired
    public void setCreditTimelineRepository(CreditTimelineRepository creditTimelineRepository) {
        this.creditTimelineRepository = creditTimelineRepository;
    }

    @Autowired
    public void setSharedService(SharedService sharedService) {
        this.sharedService = sharedService;
    }


    @Autowired
    public void setTontineStockService(TontineStockService tontineStockService) {
        this.tontineStockService = tontineStockService;
    }

    @Autowired
    public void setTontineService(TontineService tontineService) {
        this.tontineService = tontineService;
    }

    @Autowired
    public void setParameterService(ParameterService parameterService) {
        this.parameterService = parameterService;
    }

    @Transactional
    public CreditRespDto changeCollector(Long creditId, String newCollector) {
        Credit credit = getById(creditId);

        if (!CreditStatus.INPROGRESS.equals(credit.getStatus())) {
            throw new CustomValidationException(
                    "Le changement de commercial n'est autorisé que pour les ventes en cours (INPROGRESS).");
        }

        // 1. Historiser l'opération
        CreditCollectorHistory history = new CreditCollectorHistory();
        history.setCredit(credit);
        history.setOldCollector(credit.getCollector());
        history.setNewCollector(newCollector);
        history.setTotalAmount(credit.getTotalAmount());
        history.setTotalAmountPaid(credit.getTotalAmountPaid());
        history.setTotalAmountRemaining(credit.getTotalAmountRemaining());
        history.setChangeDate(java.time.LocalDateTime.now());
        creditCollectorHistoryRepository.save(history);

        // 2. Mettre à jour le crédit
        credit.setCollector(newCollector);

        // 3. Mettre à jour le recoveryCollector du client
        Client client = credit.getClient();
        if (client != null) {
            client.setRecoveryCollector(newCollector);
            clientService.update(client);
        }

        credit = update(credit);
        return CreditRespDto.fromCredit(credit);
    }

    public List<CreditCollectorHistoryDto> getCollectorHistory(Long creditId) {
        return creditCollectorHistoryRepository.findByCreditIdOrderByChangeDateDesc(creditId)
                .stream()
                .map(com.optimize.elykia.core.dto.CreditCollectorHistoryDto::fromEntity)
                .toList();
    }

    @Autowired
    public void setCommercialMonthlyStockItemRepository(CommercialMonthlyStockItemRepository commercialMonthlyStockItemRepository) {
        this.commercialMonthlyStockItemRepository = commercialMonthlyStockItemRepository;
    }

    public Page<CreditRespDto> searchCredits(CreditSearchDto dto, Pageable pageable) {
        Page<Credit> page = getRepository().findAll(CreditSpecification.build(dto), pageable);
        return CreditRespDto.fromCreditPage(page);
    }

    @Transactional
    public void bulkChangeCollector(BulkChangeCollectorDto dto) {
        if (dto.getCreditIds() == null || dto.getCreditIds().isEmpty()) {
            return;
        }

        // 1. Historiser l'opération en bulk
        creditCollectorHistoryRepository.bulkInsertHistoryForCredits(dto.getCreditIds(), dto.getNewCollector());

        // 2. Mettre à jour les crédits en bulk
        getRepository().bulkUpdateCollector(dto.getCreditIds(), dto.getNewCollector());

        // 3. Mettre à jour le recoveryCollector des clients en bulk
        getRepository().bulkUpdateClientRecoveryCollector(dto.getCreditIds(), dto.getNewCollector());
    }
}
