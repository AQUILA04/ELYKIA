package com.optimize.elykia.core.service;

import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.entities.service.GenericService;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.security.services.UserService;
import com.optimize.elykia.client.dto.ClientRespDto;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.client.service.ClientService;
import com.optimize.elykia.core.dto.*;
import com.optimize.elykia.core.dto.CreditSummaryDto;
import com.optimize.elykia.core.dto.MergeCreditDto;
import com.optimize.elykia.core.entity.*;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.enumaration.SolvencyStatus;
import com.optimize.elykia.core.enumaration.StockOperation;
import com.optimize.elykia.core.mapper.CreditMapper;
import com.optimize.elykia.core.repository.CommercialMonthlyStockRepository;
import com.optimize.elykia.core.repository.CreditRepository;
import com.optimize.elykia.core.repository.CreditTimelineRepository;
import com.optimize.elykia.core.util.DateUtils;
import com.optimize.elykia.core.util.MoneyUtil;
import com.optimize.elykia.core.util.UserProfilConstant;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;
import com.optimize.elykia.core.repository.CreditDistributionViewRepository;
import com.optimize.elykia.core.mapper.CreditDistributionMapper;
import com.optimize.elykia.core.entity.CreditDistributionView;

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

    // Services BI pour enrichissement automatique
    private CreditEnrichmentService creditEnrichmentService;
    private CreditPaymentEventService creditPaymentEventService;
    private StockMovementService stockMovementService;
    private final CreditDistributionViewRepository creditDistributionViewRepository;
    private final CreditDistributionMapper creditDistributionMapper;
    @Autowired
    private TontineStockService tontineStockService;
    @Autowired
    private TontineService tontineService;

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
                            CommercialMonthlyStockRepository commercialMonthlyStockRepository) {
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

    @Transactional
    public Credit createCredit(CreditDto creditDto) throws Exception {
        Credit credit = creditMapper.toEntity(creditDto);
        creditControlProcess(credit);

        if (ClientType.CLIENT.equals(credit.getClientType()) && getRepository().hasCreditInProgress(credit.getClientId())) {
            throw new CustomValidationException("Le client " + credit.getClient().getFullName() + " possède déjà une vente en cours et ne peut donc pas bénéficier d'une autre vente !");
        }
        if (ClientType.CLIENT.equals(credit.getClientType()) && (Objects.isNull(credit.getParent()) || Objects.isNull(credit.getParent().getId()) )){
            throw new CustomValidationException("Vente directe au client non autoriser. Merci de passer par la distribution");

        }

        //if (ClientType.PROMOTER.equals(credit.getClientType()) && getRepository().existsByCollectorAndClientTypeAndStatusAndState(credit.getCollector(), credit.getClientType(), CreditStatus.INPROGRESS, State.ENABLED)) {
          //  Optional<Credit> existingOne = getRepository().findByCollectorAndClientTypeAndStatusAndState(credit.getCollector(), credit.getClientType(), CreditStatus.INPROGRESS, State.ENABLED);

           // if (existingOne.isPresent() && Boolean.TRUE.equals(existingOne.get().getUpdatable())) {
               // Credit oldOne = existingOne.get();
               // oldOne.addNewArticles(credit.getArticles());
               // oldOne.getArticles().forEach(creditArticlesService::delete);
              //  oldOne.setUpdatable(true);
                //oldOne = update(oldOne);
               // oldOne.getArticles().forEach(creditArticlesService::create);
               // return oldOne;
           // } else {
              //  return createAndProcessCredit(credit, creditDto.getClientId());
          //  }
      //  } else {
        //    return createAndProcessCredit(credit, creditDto.getClientId());
       // }
        return createAndProcessCredit(credit, creditDto.getClientId());
    }

    @Transactional
    public Credit createTontineCredit(TontineDelivery delivery) {
        Credit credit = Credit.buildFromDelivery(delivery);
        String baseReference = generateReference(
                String.valueOf(delivery.getTontineMember().getClient().getId()),
                ClientType.CLIENT
        );
        credit.setReference("T" + baseReference);
        return this.createTontine(credit);

    }

    @Transactional
    public Credit createTontine(Credit credit) {
        if (getRepository().existsByTypeAndCollectorAndStatusAndClientTypeAndBeginDateBetween(
                OperationType.TONTINE,
                credit.getCollector(),
                CreditStatus.INPROGRESS,
                ClientType.PROMOTER,
                DateUtils.getStartYearDate(),
                DateUtils.getEndYearDate())) {
            Credit promoterTontine = getRepository()
                    .findByTypeAndCollectorAndStatusAndClientTypeAndBeginDateBetween(
                    OperationType.TONTINE,
                    credit.getCollector(),
                    CreditStatus.INPROGRESS,
                    ClientType.PROMOTER,
                    DateUtils.getStartYearDate(),
                    DateUtils.getEndYearDate()).orElseThrow();
            credit.setParent(promoterTontine);
            tontineStockService
                    .checkAvailabilityAndUpdateTontineStock(
                            credit.getArticles(),
                            credit.getCollector());
            credit = this.create(credit);
            // Save CreditArticles
            credit.setCreditToCreditArticles(); // Ensure relationship is set
            credit.getArticles().forEach(creditArticlesService::create);
            this.startCredit(credit.getId(), Boolean.TRUE);
        } else {
            Credit tontineParent = new Credit(); //faire un clone
            ClientRespDto clientDto = clientService.getRepository().findByCollectorAndClientTypeAndState(
                    credit.getCollector(),
                    ClientType.PROMOTER,
                    State.ENABLED,
                    PageRequest.of(0, 1)).getContent().stream().findFirst().orElse(null);
            Client client = new Client();
            assert clientDto != null;
            client.setId(clientDto.id());
            client.setClientType(clientDto.clientType());
            String baseReference = generateReference(
                    String.valueOf(client.getId()),
                    ClientType.PROMOTER
            );
            tontineParent.setReference("T" + baseReference);
            tontineParent.addClient(client);
            tontineParent.tontineBuilder();
            tontineParent.setArticles(credit.getArticles());
            this.create(tontineParent);
            tontineParent.setCreditToCreditArticles();
            tontineParent.getArticles().forEach(creditArticlesService::create);
            this.creditEnrichment(tontineParent);
            this.startCredit(tontineParent.getId(), Boolean.FALSE);
            return this.createTontine(credit);
        }
        // Save the credit
        return credit;
    }

    public void creditUnicity(Credit credit)  {


        if (ClientType.CLIENT.equals(credit.getClientType()) && getRepository().hasCreditInProgress(credit.getClientId())) {
            throw new CustomValidationException("Le client " + credit.getClient().getFullName() + " possède déjà une vente en cours et ne peut donc pas bénéficier d'une autre vente !");
        }
        if (ClientType.CLIENT.equals(credit.getClientType()) && (Objects.isNull(credit.getParent()) || Objects.isNull(credit.getParent().getId()))) {
            throw new CustomValidationException("Vente directe au client non autoriser. Merci de passer par la distribution");

        }
    }


    private Credit createAndProcessCredit(Credit credit, Long clientId) {
        credit = this.create(credit);
        credit.setCreditToCreditArticles();
        credit.getArticles().forEach(creditArticlesService::create);
        clientService.updateCreditStatus(clientId, Boolean.TRUE);

        // Enrichissement BI automatique
        if (creditEnrichmentService != null) {
            creditEnrichmentService.enrichCredit(credit);
            credit = update(credit);
        }

        return creditEnrichment(credit);
    }

    public Credit creditEnrichment(Credit credit) {
        if (creditEnrichmentService != null) {
            creditEnrichmentService.enrichCredit(credit);
            return update(credit);
        }
        return credit;
    }

    @Transactional
    public Credit updateCredit(CreditDto creditDto, Long id) {
        creditDto.setId(id);
        Credit credit = creditMapper.toEntity(creditDto);
        final Credit oldOne = getById(id);
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
        return credit;
    }

    public void creditControlProcess(Credit credit) {
        Client client = clientService.getById(credit.getClientId());
        client.hasValidAccount();
        if (Objects.isNull(credit.getId())){
            credit.getArticles().forEach(article -> {
                        article.setArticles(articlesService.getById(article.getArticlesId()));
                        article.setUnitPrice(article.getArticles().getCreditSalePrice());
                    }
            );
        }else {
            Credit oldOne= getById(credit.getId());
            Set<CreditArticles> creditArticles = new HashSet<>();
            for (CreditArticles newOne: credit.getArticles()){
                for ( CreditArticles existingOne : oldOne.getArticles()){
                    if (newOne.getArticlesId().equals(existingOne.getArticlesId())){
                        newOne.setUnitPrice(existingOne.getUnitPrice());
                        newOne.setId(existingOne.getId());
                        newOne.setArticles(existingOne.getArticles());
                    }
                }
                if (Objects.isNull(newOne.getId())){
                    newOne.setArticles(articlesService.getById(newOne.getArticlesId()));
                    newOne.setUnitPrice(newOne.getArticles().getCreditSalePrice());
                }
                creditArticles.add(newOne);
            }
            credit.setArticles(creditArticles);
        }

        credit.setUp();
        client.allowCreditAmountControl(credit.getTotalAmount(), dividend);
        credit.setClient(client);
        credit.setType(OperationType.CREDIT);
        credit.setCollector(client.getCollector());
        credit.checkAdvance();
        credit.setClientType(Objects.nonNull(client.getClientType()) ? client.getClientType() : ClientType.CLIENT);
        if (!StringUtils.hasText(credit.getReference())) {
            credit.setReference(generateReference(client.getId().toString(), credit.getClientType()));
        }

    }

    @Transactional
    public String backToStore(ReturnArticlesDto dto) {
        Credit credit = getById(dto.getCreditId());
        credit.supportedBackToStoreOperation();
        final String connectedUser = userService.getCurrentUser().getUsername();

        Credit finalCredit = credit;
        credit.getArticles().forEach(creditArticles -> dto.getReturnArticles().forEach(returnArticles -> {
            if (returnArticles.getArticleId().equals(creditArticles.getArticles().getId())) {
                creditArticles.returnQuantity(returnArticles.getQuantity());
                creditArticlesService.update(creditArticles);
                Articles articles = creditArticles.getArticles();
                articles.makeEntry(returnArticles.getQuantity());
                //articlesService.makeStockEntries()
                StockEntry stockEntry = new StockEntry();
                stockEntry.setArticleId(articles.getId());
                stockEntry.setUnitPrice(articles.getCreditSalePrice());
                stockEntry.setQuantity(returnArticles.getQuantity());
                articlesService.update(articles);
                ArticleHistory articleHistory = ArticleHistory.buildEntryHistory(articles, stockEntry, connectedUser);
                articlesService.getArticleHistoryService().create(articleHistory);
                // Création de l'historique de retour
                CreditReturnHistory returnHistory = CreditReturnHistory.createReturnHistory(
                        finalCredit, articles, returnArticles.getQuantity(), connectedUser);
                creditReturnHistoryService.create(returnHistory);
            }
        }));

        // Vérifier si tous les articles ont une quantité de 0
        boolean allArticlesQuantityZero = credit.getArticles().stream()
                .allMatch(article -> article.getQuantity() == 0);

        // Si tous les articles ont une quantité de 0, définir updatable à false
        if (allArticlesQuantityZero) {
            credit.setUpdatable(false);
            update(credit);
        }
        credit = getById(dto.getCreditId());
        credit.setTotalAmount(credit.getTotalAmountByCalcul());
        credit.setTotalAmountRemaining(credit.getTotalAmount());
        credit.setDailyStake(MoneyUtil.calculateDailyStake(credit.getDailyStakeCalculated()));
        update(credit);

        return "\"success\":true";
    }

    public boolean changeDailyStake(ChangeDailyStakeDto dto) {
        Credit credit = getById(dto.creditId());
        credit.changeDailyStake(dto.dailyStake());
        repository.saveAndFlush(credit);
        return Boolean.TRUE;
    }

    @Transactional
    public Credit distributeArticles(DistributeArticleDto dto) {
        dto.validateEntryArticles();
        Credit credit = getById(dto.getCreditId());
        credit.checkStartStatus();
        Client client = clientService.getById(dto.getClientId());

        //credit.supportedBackToStoreOperation();

        if (ClientType.PROMOTER.equals(client.getClientType())) {
            throw new CustomValidationException("Opération non disponible pour ce type de client !");
        }

        Credit clientCredit = new Credit();
        clientCredit.setClient(client);
        clientCredit.setArticles(CreditArticles.from(dto.getArticles()));
        clientCredit.setParent(credit);
        // Correction: Associer d'abord les articles au crédit
        clientCredit.setCreditToCreditArticles();
        clientCredit.setAdvance(dto.getAdvance());
        // Vérifier si toutes les quantités seront distribuées après cette opération
        AtomicBoolean allQuantitiesDistributed = new AtomicBoolean(true);
        creditControlProcess(clientCredit);
        creditUnicity(clientCredit);
        clientCredit.getArticles().forEach(creditArticles -> {
            Integer totalDistributed  = getRepository()
                    .sumTotalArticleDistributedForParentCredit(creditArticles.getArticlesId(), credit.getId());
            CreditArticles parent = credit.getArticles().stream()
                    .filter(ca -> ca.getArticlesId().equals(creditArticles.getArticlesId()))
                    .findFirst()
                    .orElse(new CreditArticles());
            if (Objects.isNull(totalDistributed)) {
                totalDistributed = 0;
            }
            if ((totalDistributed + creditArticles.getQuantity()) > parent.getQuantity()) {
                throw new CustomValidationException("Il ne reste plus de quantité suffisante pour la distribution de l'article {" + parent.getArticles().getCommercialName() + "}");
            }

            // Vérifier si la quantité distribuée + la quantité en cours de distribution est différente de la quantité totale
            if ((totalDistributed + creditArticles.getQuantity()) < parent.getQuantity()) {
                allQuantitiesDistributed.set(false);
            }
        });
        // Sauvegarder le crédit après que tout soit correctement configuré
        if (Objects.nonNull(dto.getMobile()) && dto.getMobile()) {
            clientCredit.setTotalAmount(dto.getTotalAmount());
            clientCredit.setDailyStake(dto.getDailyStake());
            clientCredit.setTotalAmountRemaining(dto.getTotalAmount()-dto.getAdvance());
            clientCredit.setTotalAmountPaid(dto.getAdvance());
            clientCredit.setBeginDate(dto.getStartDate());
            clientCredit.setExpectedEndDate(dto.getEndDate());
            clientCredit.setRemainingDaysCount(Long.valueOf(ChronoUnit.DAYS.between(LocalDate.now(), dto.getEndDate())).intValue());
        }
        repository.saveAndFlush(clientCredit);

        // Mettre à jour le statut du client
        clientService.updateCreditStatus(client.getId(), Boolean.TRUE);
        validateCredit(clientCredit.getId());
        startCredit(clientCredit.getId(), Boolean.TRUE);
        // Si toutes les quantités sont distribuées, mettre à jour l'attribut updatable du crédit parent
        if (allQuantitiesDistributed.get()) {
            credit.setUpdatable(false);
            repository.saveAndFlush(credit);
        }
        return clientCredit;
    }

    @Transactional
    public Credit distributeArticlesV2(DistributeArticleDto dto) {
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
                    .orElseThrow(() -> new CustomValidationException("Article non trouvé dans le stock du commercial : " + creditArticles.getArticles().getCommercialName()));

            if (stockItem.getQuantityRemaining() < creditArticles.getQuantity()) {
                throw new CustomValidationException("Stock insuffisant chez le commercial pour l'article : " + creditArticles.getArticles().getCommercialName());
            }

            // Mise à jour des compteurs
            stockItem.setQuantitySold(stockItem.getQuantitySold() + creditArticles.getQuantity());
            stockItem.updateRemaining();
        });
        
        // Sauvegarde du stock mis à jour
        commercialMonthlyStockRepository.save(monthlyStock);

        // Configuration finale du crédit
        if (Objects.nonNull(dto.getMobile()) && dto.getMobile()) {
            clientCredit.setTotalAmount(dto.getTotalAmount());
            clientCredit.setDailyStake(dto.getDailyStake());
            clientCredit.setTotalAmountRemaining(dto.getTotalAmount()-dto.getAdvance());
            clientCredit.setTotalAmountPaid(dto.getAdvance());
            clientCredit.setBeginDate(dto.getStartDate());
            clientCredit.setExpectedEndDate(dto.getEndDate());
            clientCredit.setRemainingDaysCount(Long.valueOf(ChronoUnit.DAYS.between(LocalDate.now(), dto.getEndDate())).intValue());
        }
        
        repository.saveAndFlush(clientCredit);

        // Mettre à jour le statut du client
        clientService.updateCreditStatus(client.getId(), Boolean.TRUE);
        validateCredit(clientCredit.getId());
        startCredit(clientCredit.getId(), Boolean.TRUE);
        
        return clientCredit;
    }

    public List<CreditDistributionDto> getCreditDistribution(Long creditId) {
        List<CreditDistributionView> distributionView = creditDistributionViewRepository.findByCreditParentId(creditId);
        return distributionView.stream()
                .map(creditDistributionMapper::toDto)
                .collect(Collectors.toList());
    }

    public CreditWithDistribution getCreditWithDistribution(Long id) {
        Credit credit = getById(id);
        List<Credit> distributions  = getRepository().findByParent_id(id);
        return new CreditWithDistribution(credit, distributions);
    }

    public Page<Credit> getSortieHistory(String collector, Pageable pageable) {
        return getRepository().findByUpdatableFalseAndClientTypeAndCollector(ClientType.PROMOTER, collector, pageable);
    }
    //Total avance par commercial
    public Double getTotalAdvanceForCommercial(String commercialUsername) {
        Double total = getRepository().getTotalAdvanceByCommercial(
                commercialUsername,
                ClientType.CLIENT,
                CreditStatus.INPROGRESS
        );
        return total != null ? total : 0.0;
    }
    //Total de vente non distribuer par le commercial
    public Double getTotalNotDistributedForCommercial(String commercialUsername) {
        Double total = getRepository().getTotalNotDistributedAmountByCommercial(
                commercialUsername);
        return total != null ? total : 0.0;
    }

    //nouveau

    @Autowired
    private CreditRepository creditRepository;

    public Double getTotalDisbursedAmountForPeriod(LocalDate startDate, LocalDate endDate) {
        List<CreditStatus> disbursedStatuses = List.of(CreditStatus.INPROGRESS, CreditStatus.DELIVERED, CreditStatus.ENDED, CreditStatus.SETTLED);

        Double totalAmount = creditRepository.sumTotalAmountByBeginDateBetweenAndStatusInAndState(
                startDate,
                endDate,
                disbursedStatuses,
                State.ENABLED,
                ClientType.PROMOTER
        );

        return totalAmount == null ? 0.0 : totalAmount;
    }

    public CommercialDetails getCommercialDetails(Long id) {
        User user = userService.getById(id);
        String username = user.getUsername();
        CommercialDetails commercialDetails = new CommercialDetails();
        Double totalNonDistributed = this.getTotalNotDistributedForCommercial(username);
        commercialDetails.setName(user.getFirstname() + " " + user.getLastname());
        commercialDetails.setPhone(user.getPhone());
        commercialDetails.setTotalClient(getRepository().getTotalClientByCommercial(user.getUsername(), ClientType.CLIENT));
        commercialDetails.setTotalCreditClosed(getRepository().countByStatusAndCollectorAndClientType(CreditStatus.SETTLED, user.getUsername(), ClientType.CLIENT));
        commercialDetails.setTotalCreditDelayed(getRepository().countByStatusAndCollectorAndClientTypeAndSolvencyNote(CreditStatus.INPROGRESS, user.getUsername(), ClientType.CLIENT, SolvencyStatus.LATE));
        commercialDetails.setTotalInProgressCredit(getRepository().countByStatusAndCollectorAndClientType(CreditStatus.INPROGRESS, user.getUsername(), ClientType.CLIENT));
        commercialDetails.setTotalAmountCollected(getRepository().getTotalInProgressAmountPaidByCommercial(user.getUsername(), ClientType.CLIENT, CreditStatus.INPROGRESS));
        commercialDetails.setTotalAmountDue(getRepository().getTotalAmountDueTodayByCommercial(user.getUsername()));
        commercialDetails.setTotalInProgressCreditAmount(getRepository().getTotalInProgressAmountByCommercial(user.getUsername(), ClientType.CLIENT,ClientType.PROMOTER, CreditStatus.INPROGRESS,State.ENABLED) );
        commercialDetails.setTotalInProgressRemainingAmount(getRepository().getTotalInProgressRemainingAmountByCommercial(user.getUsername(), ClientType.CLIENT,ClientType.PROMOTER, CreditStatus.INPROGRESS, State.ENABLED));
        // On remplit les nouveaux champs en appelant les méthodes que nous venons de créer
        commercialDetails.setTotalAdvance(this.getTotalAdvanceForCommercial(username));
        commercialDetails.setTotalNotDistributed(totalNonDistributed);


        return commercialDetails;
    }

    public Integer getTotalDistributed(Long creditId, Long articleId) {
        Integer totalDistributed = getRepository().sumTotalArticleDistributedForParentCredit(articleId, creditId);
        return Objects.nonNull(totalDistributed) ? totalDistributed : 0;
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
        if (Boolean.FALSE.equals(distribution)) {
            credit.getArticles().forEach(article -> {
                if (!article.hasStockAvailable()) {
                    articleOutOfStock.add(article.getArticles().getCommercialName());
                }
            });

            if (!articleOutOfStock.isEmpty()) {
                throw new CustomValidationException("Stock manquant pour démarrer le crédit: Articles Manquants: " + articleOutOfStock.stream().collect(Collectors.joining("; \n")));
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
                            finalCredit
                    );
                });
            }
            if (OperationType.TONTINE.equals(credit.getType())) {
                credit = mergeTontine(credit);
            }
        }
        LocalDate accountingDate = sharedService.getAccountingDayService().getCurrentAccountingDate();
        credit.setAccountingDate(accountingDate);
        credit.setReleaseDate(accountingDate);
        credit.start();
        repository.saveAndFlush(credit);

        return Boolean.TRUE;
    }

    public Credit getByClient(Long clientId, String collector) {
        return getRepository().findByClient_idAndCollectorAndStatus(clientId, collector, CreditStatus.INPROGRESS)
                .orElseThrow(() -> new ResourceNotFoundException("Crédit non trouvé pour le promoteur "+ collector + " avec l'identifiant du client "+ clientId));
    }

    public Page<Credit> elasticsearch(String keyword, Pageable pageable) {
        return getRepository().elasticsearch(keyword, pageable);
    }

    public Page<Credit> getCreditByCollector(Pageable pageable) {
        User user = userService.getCurrentUser();
        if (user.is(UserProfilConstant.PROMOTER) && !dailyAccountancyService.isOpenCashDesk()) {
            throw new ApplicationException("Aucune caisse ouverte pour l'utilisateur " + user.getUsername());
        }
        return getRepository().findByStatusAndCollectorAndDailyPaidIsFalseAndClientTypeOrderByClient_quarterAsc(CreditStatus.INPROGRESS, user.getUsername(), ClientType.CLIENT, pageable);
    }

    public Page<CreditRespDto> getCreditByCollectors(String collector, Pageable pageable) {
        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by("id").descending());
        final Page<CreditRespDto> credits = getRepository()
                .findByStatusAndCollectorAndClientTypeOrderByClient_quarterAsc(CreditStatus.INPROGRESS, collector, ClientType.CLIENT, pageable);
        final List<CreditRespDto> content = credits.getContent().stream().map(credit -> credit.addArticles(creditArticlesService.getRepository().findByCredit_id(credit.id()))).toList();
        return new PageImpl<>(content, pageable, content.size());
    }

    public Page<CreditRespDto> getCreditHistoryByCollectors(String collector, Pageable pageable) {
        return getRepository().findByStatusAndCollectorAndClientTypeOrderByClient_quarterAsc(CreditStatus.SETTLED, collector, ClientType.CLIENT, pageable);
    }

    public Page<Credit> getPendingSortieByCollectors(String collector, Pageable pageable) {
        return getRepository().findByStatusInAndCollectorAndClientTypeOrderByClient_quarterAsc(List.of(CreditStatus.CREATED, CreditStatus.VALIDATED), collector, ClientType.PROMOTER, pageable);
    }



    public List<Credit> getCreditByCollector() {
        User user = userService.getCurrentUser();
        if (!dailyAccountancyService.isOpenCashDesk()) {
            throw new ApplicationException("Aucune caisse ouverte pour l'utilisateur " + user.getUsername());
        }
        //filtre
        List<Credit> rawCredits = getRepository().findByStatusAndCollectorAndDailyPaidIsFalseAndClientTypeOrderByClient_quarterAsc(CreditStatus.INPROGRESS, user.getUsername(), ClientType.CLIENT);
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

    public Page<Credit> getAll(Pageable pageable, String searchTerm) {
        // NOUVELLE LOGIQUE DE RECHERCHE
        // Si un terme de recherche est fourni, on l'utilise en priorité
        if (StringUtils.hasText(searchTerm)) {
            // On appelle votre méthode de recherche existante
            return getRepository().elasticsearch(searchTerm, pageable);
        }

        // Si aucun terme de recherche n'est fourni, on applique la logique originale
        User user = userService.getCurrentUser();
        if (user.is(UserProfilConstant.PROMOTER)) {
            return getRepository().findByCollectorAndState(user.getUsername(), State.ENABLED, pageable);
        }
        return getRepository().findByState(State.ENABLED, pageable);
    }

    public Page<Credit> getAllValidatedCredit(String collector, Pageable pageable) {
        if (StringUtils.hasText(collector)) {
            return getRepository().findByStatusAndClientTypeAndCollector(CreditStatus.VALIDATED, ClientType.PROMOTER, collector, pageable);
        }
        return getRepository().findByStatus(CreditStatus.VALIDATED, pageable);
    }

    public Page<Credit> getCreditHistories(Pageable pageable) {
        return getRepository().findByStatusInAndClientType(List.of(CreditStatus.INPROGRESS, CreditStatus.DELIVERED, CreditStatus.ENDED, CreditStatus.SETTLED), ClientType.PROMOTER, pageable);
    }

    public Set<CreditArticles> getBackToStoreArticles(Long creditId) {
        Credit credit = getById(creditId);
        if (!ClientType.PROMOTER.equals(credit.getClientType())) {
            throw new ApplicationException("Operation non supporté pour cette vente !");
        }
        return credit.getArticles();
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
        clientDetails.setAccountNumber(Objects.nonNull(client.getAccount()) ? client.getAccount().getAccountNumber() : null);
        clientDetails.setCollector(client.getCollector());
        clientDetails.setTotalInProgressCredit(getRepository().countCreditsByClientId(clientId, CreditStatus.INPROGRESS));
        clientDetails.setTotalCreditClosed(getRepository().countByStatusAndClient_id(CreditStatus.SETTLED, clientId));
        clientDetails.setTotalCreditDelayed(getRepository().countByStatusAndClient_idAndSolvencyNote(CreditStatus.INPROGRESS, clientId, SolvencyStatus.LATE));
        clientDetails.setTotalInProgressCreditAmount(getRepository().getTotalInProgressAmountByClientId(clientId, CreditStatus.INPROGRESS));
        clientDetails.setTotalInProgressAmountCollected(getRepository().getTotalInProgressAmountPaidByClientId(clientId, CreditStatus.INPROGRESS));
        clientDetails.setTotalInProgressAmountDue(getRepository().getTotalAmountDueTodayByClientId(clientId));
        return clientDetails;
    }



    public Page<Credit> getCreditsByClientAndStatus(Long clientId, CreditStatus status, Pageable pageable) {
        return getRepository().findByClient_idAndStatus(clientId, status, pageable);
    }

    public Page<Credit> getCreditsByClientAndStatusIn(Long clientId, List<CreditStatus> statuses, Pageable pageable) {
        return getRepository().findByClient_idAndStatusIn(clientId, statuses, pageable);
    }

    public Page<Credit> getsortiesByCollector(
            String collector,
            Pageable pageable) {

        return getRepository().findByCollectorAndClientTypeAndStatusInOrderByIdDesc(
            collector,
            ClientType.PROMOTER,
            List.of(CreditStatus.INPROGRESS, CreditStatus.SETTLED),
            pageable
        );
    }

    public String generateReference(String clientId, ClientType clientType) {
        String yy = ""+LocalDate.now().getYear();
        String initial = clientType.name().substring(0,1);
        return initial+yy.substring(2) + clientId + RandomStringUtils.randomNumeric(4);
    }

    public Page<Credit> getDistributions(Long creditId, Pageable pageable) {
        return getRepository().findByParent_id(creditId, pageable);
    }

    public Page<CreditTimeline> getTimelines(Long creditId, Pageable pageable) {
        return creditTimelineRepository.findByCredit_id(creditId, pageable);
    }

    @Transactional
    public void updatePromoterCreditStatusBatch() {
        int page = 0;
        int size = 20; // Taille du batch
        Page<Credit> creditPage;

        do {
            creditPage = getRepository().findByClientTypeAndStatusAndBeginDateBefore(
                ClientType.PROMOTER,
                CreditStatus.INPROGRESS,
                LocalDate.now().minusMonths(1),
                PageRequest.of(page, size, Sort.by("id").descending())
            );

            for (Credit credit : creditPage) {
                List<Credit> children = getRepository().findByParent_id(credit.getId());

                boolean allChildrenSettled = children.stream()
                    .allMatch(child -> child.getStatus() == CreditStatus.SETTLED);

                if (allChildrenSettled) {
                    credit.setStatus(CreditStatus.SETTLED);
                    getRepository().save(credit);
                }
            }
            page++;
        } while (creditPage.hasNext());
    }

    @Transactional
    public void updatePromoterCreditAmountBatch() {
        int page = 0;
        int size = 20;
        Page<Credit> creditPage;
        do {
            creditPage = getRepository()
                    .findByStatusInAndClientType(List.of(CreditStatus.INPROGRESS),
                            ClientType.PROMOTER,
                            PageRequest.of(page, size,
                                    Sort.by("id").descending()));
            for (Credit credit : creditPage) {
                PromoterCreditTotalAmountPaid promoterCreditTotalAmountPaid = getRepository()
                        .getPromoterCreditTotalAmountPaidAndTotalAmountRemaining(credit.getId());
                credit.setTotalAmountPaid(promoterCreditTotalAmountPaid.getTotalAmountPaid());
                credit.setTotalAmountRemaining(promoterCreditTotalAmountPaid.getTotalAmountRemaining());
                repository.saveAndFlush(credit);
            }
            page++;
        } while (creditPage.hasNext());
    }

    public Page<Credit> getDelayedCreditsByCommercial(String commercial, Pageable pageable) {
        return getRepository().getDelayedCredits(commercial, pageable);
    }

    public Page<Credit> getEndingCreditsByCommercial(String commercial, Pageable pageable) {
        return getRepository().getEndingCredits(commercial, pageable);
    }
    @Transactional
    @Override
    public boolean deleteSoft(Long id) throws ApplicationException {
        Credit credit = getById(id);
        boolean result= super.deleteSoft(id);
        if (Boolean.TRUE.equals(result)){
            clientService.updateCreditStatus(credit.getClientId(), Boolean.FALSE);
        }
        return result;
    }

    public List<StockOutput> getCommercialStockOutput(String commercialUsername) {
        List<StockOutput> stock = getRepository().findActiveCommercialCredits(commercialUsername);
        return stock.stream()
                .map(stockOutput ->
                        stockOutput.addItems(getRepository().findStockOutputItemsByCreditId(stockOutput.id()))).toList();
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

    /**
     * Récupère la liste des crédits en cours d'un commercial pour la fusion
     */
    public List<CreditSummaryDto> getMergeableCreditsByCommercial(String commercialUsername) {
        List<Credit> credits = getRepository().findByCollectorAndClientTypeAndStatusAndUpdatableAndState(
            commercialUsername, ClientType.PROMOTER, CreditStatus.INPROGRESS, true, State.ENABLED);
        
        return credits.stream()
            .map(credit -> new CreditSummaryDto(
                credit.getId(),
                credit.getReference(),
                credit.getBeginDate(),
                credit.getTotalAmount()
            ))
            .toList();
    }

    /**
     * Fusionne plusieurs crédits d'un commercial en un seul
     */
    @Transactional
    public String mergeCredits(MergeCreditDto dto) {
        // Validation des données d'entrée
        if (dto.getCreditIds().isEmpty()) {
            throw new CustomValidationException("La liste des IDs de crédit ne peut pas être vide");
        }

        // Récupération des crédits à fusionner
        List<Credit> creditsToMerge = getRepository().findByIdInAndCollectorAndClientTypeAndUpdatableAndState(
            dto.getCreditIds(), dto.getCommercialUsername(), ClientType.PROMOTER, true, State.ENABLED);

        // Validation que tous les crédits existent et appartiennent au commercial
        if (creditsToMerge.size() != dto.getCreditIds().size()) {
            throw new CustomValidationException("Certains crédits n'existent pas ou n'appartiennent pas au commercial spécifié");
        }

        // Validation que tous les crédits sont fusionnables
        for (Credit credit : creditsToMerge) {
            if (!credit.getCollector().equals(dto.getCommercialUsername())) {
                throw new CustomValidationException("Tous les crédits doivent appartenir au même commercial");
            }
            if (!ClientType.PROMOTER.equals(credit.getClientType())) {
                throw new CustomValidationException("Seuls les crédits de type PROMOTER peuvent être fusionnés");
            }
            if (!Boolean.TRUE.equals(credit.getUpdatable())) {
                throw new CustomValidationException("Tous les crédits doivent être modifiables pour être fusionnés");
            }
        }

        // Création du nouveau crédit fusionné
        Credit mergedCredit = createMergedCredit(creditsToMerge, dto.getCommercialUsername());
        
        // Sauvegarde du nouveau crédit
        mergedCredit = repository.saveAndFlush(mergedCredit);
        
        // Mise à jour des crédits enfants (distributions)
        updateChildCreditsParent(creditsToMerge, mergedCredit.getId());
        
        // Mise à jour des articles de crédit
        updateCreditArticlesParent(creditsToMerge, mergedCredit.getId());
        
        // Suppression logique des anciens crédits
        markCreditsAsDeleted(creditsToMerge);
        
        return mergedCredit.getReference();
    }

    private Credit createMergedCredit(List<Credit> creditsToMerge, String commercialUsername) {
        Credit mergedCredit = new Credit();

        // --- Calculs des totaux sécurisés ---
        double totalAmount = creditsToMerge.stream()
                .map(Credit::getTotalAmount)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();

        double totalAmountPaid = creditsToMerge.stream()
                .map(Credit::getTotalAmountPaid)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();

        double totalAmountRemaining = creditsToMerge.stream()
                .map(Credit::getTotalAmountRemaining)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();

        double totalPurchase = creditsToMerge.stream()
                .map(Credit::getTotalPurchase)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();

        mergedCredit.setTotalAmount(totalAmount);
        mergedCredit.setTotalAmountPaid(totalAmountPaid);
        mergedCredit.setTotalAmountRemaining(totalAmountRemaining);
        mergedCredit.setTotalPurchase(totalPurchase);

        // --- Dates ---
        LocalDate oldestBeginDate = creditsToMerge.stream()
                .map(Credit::getBeginDate)
                .filter(Objects::nonNull)
                .min(LocalDate::compareTo)
                .orElse(LocalDate.now());
        mergedCredit.setBeginDate(oldestBeginDate);

        LocalDate latestExpectedEndDate = creditsToMerge.stream()
                .map(Credit::getExpectedEndDate)
                .filter(Objects::nonNull)
                .max(LocalDate::compareTo)
                .orElse(LocalDate.now().plusDays(30));
        mergedCredit.setExpectedEndDate(latestExpectedEndDate);

        LocalDate latestAccountingDate = creditsToMerge.stream()
                .map(Credit::getAccountingDate)
                .filter(Objects::nonNull)
                .max(LocalDate::compareTo)
                .orElse(null);
        mergedCredit.setAccountingDate(latestAccountingDate);

        LocalDate latestReleaseDate = creditsToMerge.stream()
                .map(Credit::getReleaseDate)
                .filter(Objects::nonNull)
                .max(LocalDate::compareTo)
                .orElse(null);
        mergedCredit.setReleaseDate(latestReleaseDate);

        // --- Propriétés générales ---
        mergedCredit.setClientType(ClientType.PROMOTER);
        mergedCredit.setUpdatable(true);
        mergedCredit.setCollector(commercialUsername);
        mergedCredit.setStatus(CreditStatus.INPROGRESS);
        mergedCredit.setState(State.ENABLED);

        // --- Client & Type ---
        Credit firstCredit = creditsToMerge.get(0);
        if (firstCredit.getClient() == null) {
            throw new IllegalStateException("Le premier crédit n’a pas de client associé");
        }

        mergedCredit.setClient(firstCredit.getClient());
        mergedCredit.setType(firstCredit.getType());

        // --- Référence ---
        String baseReference = generateReference(
                String.valueOf(firstCredit.getClient().getId()),
                ClientType.PROMOTER
        );
        mergedCredit.setReference("F" + baseReference);

        // --- Mise journalière ---
        double totalDailyStake = creditsToMerge.stream()
                .map(Credit::getDailyStake)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();
        mergedCredit.setDailyStake(totalDailyStake);

        // --- Jours restants ---
        if (mergedCredit.getDailyStake() > 0) {
            double exactDays = totalAmountRemaining / mergedCredit.getDailyStake();
            mergedCredit.setRemainingDaysCount((int) Math.ceil(exactDays));
        }

        // --- Avances ---
        double totalAdvance = creditsToMerge.stream()
                .map(Credit::getAdvance)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();
        mergedCredit.setAdvance(totalAdvance);

        return mergedCredit;
    }


    private void updateChildCreditsParent(List<Credit> creditsToMerge, Long newParentId) {
        List<Long> oldCreditIds = creditsToMerge.stream().map(Credit::getId).toList();
        
        for (Long oldCreditId : oldCreditIds) {
            List<Credit> childCredits = getRepository().findByParent_id(oldCreditId);
            for (Credit child : childCredits) {
                child.setParent(new Credit(newParentId));
                repository.save(child);
            }
        }
    }

    private void updateCreditArticlesParent(List<Credit> creditsToMerge, Long newCreditId) {
        for (Credit credit : creditsToMerge) {
            if (credit.getArticles() != null) {
                for (CreditArticles article : credit.getArticles()) {
                    article.setCredit(new Credit(newCreditId));
                    creditArticlesService.update(article);
                }
            }
        }
    }

    private void markCreditsAsDeleted(List<Credit> creditsToMerge) {
        for (Credit credit : creditsToMerge) {
            credit.setState(State.DELETED);
            credit.setStatus(CreditStatus.MERGED);
            credit.setUpdatable(Boolean.FALSE);
            repository.save(credit);
        }
    }

    @Transactional
    public Credit createTontineForCommercial(CreditDto creditDto) {
        Credit tontine = creditMapper.toEntity(creditDto);
        Client client = clientService.getById(tontine.getClientId());
        tontine.getArticles().forEach(ca -> {
            Articles article = articlesService.getById(ca.getArticlesId());
            ca.setArticles(article);
            ca.setUnitPrice(article.getSellingPrice());
        });
        tontine.tontineBuilder();
        tontine.addClient(client);
        Credit checkExistingOne = getRepository()
                .findByTypeAndCollectorAndStatusInAndClientTypeAndBeginDateBetween(OperationType.TONTINE,
                        tontine.getCollector(),
                        List.of(CreditStatus.CREATED, CreditStatus.VALIDATED),
                        ClientType.PROMOTER,
                        DateUtils.getStartYearDate(),
                        DateUtils.getEndYearDate())
                .orElse(null);
        if (Objects.nonNull(checkExistingOne)) {
            tontine.getArticles().forEach(ca -> {
                ca.setCredit(checkExistingOne);
                creditArticlesService.create(ca);
                checkExistingOne.getArticles().add(ca);
            });
            checkExistingOne.addTontine(tontine);
            checkExistingOne.setStatus(CreditStatus.CREATED);
            repository.saveAndFlush(checkExistingOne);

        } else {
            create(tontine);
            tontine.setCreditToCreditArticles();
            tontine.getArticles().forEach(creditArticlesService::create);
        }

        return creditEnrichment(tontine);
    }

    /**
     * à utiliser uniquement dans startCredit
     * @param tontine la tontine
     * @return CRedit
     */
    @Transactional
    public Credit mergeTontine(Credit tontine) {
        if (getRepository().existsByTypeAndCollectorAndStatusAndClientTypeAndBeginDateBetween(
                OperationType.TONTINE,
                tontine.getCollector(),
                CreditStatus.INPROGRESS,
                ClientType.PROMOTER,
                DateUtils.getStartYearDate(),
                DateUtils.getEndYearDate())) {
            Credit existingTontine = getRepository()
                    .findByTypeAndCollectorAndStatusAndClientTypeAndBeginDateBetween(
                            OperationType.TONTINE,
                            tontine.getCollector(),
                            CreditStatus.INPROGRESS,
                            ClientType.PROMOTER,
                            DateUtils.getStartYearDate(),
                            DateUtils.getEndYearDate())
                    .orElseThrow();
            existingTontine.addNewArticles(tontine.getArticles());
            creditArticlesService.getRepository().saveAllAndFlush(existingTontine.getArticles());
            tontine.getArticles().forEach(ca -> {
                ca.setCredit(existingTontine);
                var tontineStock = tontineStockService.updateArticleStock(ca, tontine.getCollector(), StockOperation.ADD);
                if(Objects.isNull(tontineStock)) {
                    TontineStock.build(existingTontine, ca, tontineService.getActiveSession());
                }
            });
            existingTontine.addTontine(tontine);
            repository.saveAndFlush(existingTontine);
            tontine.setStatus(CreditStatus.MERGED);
            tontine.setState(State.DELETED);
            repository.saveAndFlush(tontine);
            tontine.setCreditToCreditArticles();
            creditArticlesService.getRepository().saveAllAndFlush(tontine.getArticles());
            return existingTontine;
        } else {
            tontine.getArticles().forEach(ca -> {
                tontineStockService.create(
                        TontineStock.build(tontine, ca, tontineService.getActiveSession()));
            });

            return tontine;
        }
    }
}
