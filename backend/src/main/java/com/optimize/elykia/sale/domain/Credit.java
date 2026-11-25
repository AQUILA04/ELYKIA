package com.optimize.elykia.sale.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.sale.domain.policy.SaleLifecyclePolicies;
import com.optimize.elykia.sale.domain.policy.SaleLifecyclePolicy;
import com.optimize.elykia.sale.web.dto.DistributeArticleDto;
import com.optimize.elykia.sale.web.dto.CreditSourceMonthlyStockDto;
import com.optimize.elykia.shared.domain.OperationType;
import com.optimize.elykia.shared.carnet.CarnetVerifiable;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.proxy.HibernateProxy;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
public class Credit extends BaseEntity<String> implements CarnetVerifiable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Multi-agency scope (FK agency.id). */
    @Column(name = "agency_id")
    private Long agencyId;
    @ManyToOne
    private Client client;
    @OneToMany(mappedBy = "credit", cascade = CascadeType.ALL)
    @ToString.Exclude
    private Set<CreditArticles> articles;
    private LocalDate beginDate;
    private LocalDate expectedEndDate;
    private LocalDate effectiveEndDate;
    @Enumerated(EnumType.STRING)
    private SolvencyStatus solvencyNote = SolvencyStatus.ND;
    private Integer lateDaysCount = 0;
    @Positive
    private Double totalAmount;
    @Column(columnDefinition = "double precision default 0")
    @PositiveOrZero
    private Double totalPurchase;
    @PositiveOrZero
    private Double totalAmountPaid;
    @PositiveOrZero
    private Double totalAmountRemaining;
    @PositiveOrZero
    private Double dailyStake;
    @Enumerated(EnumType.STRING)
    private CreditStatus status;
    @PositiveOrZero
    private Integer remainingDaysCount;
    /** @deprecated Utiliser {@link #commercialUsername}. */
    @Deprecated(since = "2.14.0", forRemoval = true)
    private String collector;

    @Column(name = "commercial_username")
    private String commercialUsername;
    @Enumerated(EnumType.STRING)
    private OperationType type;
    @Column(columnDefinition = "boolean default false")
    private Boolean dailyPaid = false;
    @Enumerated(EnumType.STRING)
    private ClientType clientType;
    @Deprecated
    @ManyToOne
    private Credit parent = null;
    @Deprecated
    @Column(columnDefinition = "boolean default true")
    private Boolean updatable = true;
    @Column(unique = true)
    private String reference;
    private LocalDate accountingDate;
    private LocalDate releaseDate;
    @Column(columnDefinition = "boolean default false")
    private Boolean releasePrinted;
    private String oldReference;
    /** @deprecated Utiliser {@link #agencyCommercialUsername}. */
    @Deprecated(since = "2.14.0", forRemoval = true)
    private String agencyCommercial;

    @Column(name = "agency_commercial_username")
    private String agencyCommercialUsername;

    public void setCommercialUsername(String commercialUsername) {
        this.commercialUsername = commercialUsername;
        this.collector = commercialUsername;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setCollector(String collector) {
        this.collector = collector;
        this.commercialUsername = collector;
    }

    public String getCommercialUsername() {
        return commercialUsername != null ? commercialUsername : collector;
    }

    public void setAgencyCommercialUsername(String agencyCommercialUsername) {
        this.agencyCommercialUsername = agencyCommercialUsername;
        this.agencyCommercial = agencyCommercialUsername;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setAgencyCommercial(String agencyCommercial) {
        this.agencyCommercial = agencyCommercial;
        this.agencyCommercialUsername = agencyCommercial;
    }

    public String getAgencyCommercialUsername() {
        return agencyCommercialUsername != null ? agencyCommercialUsername : agencyCommercial;
    }

    @Column(name = "operation_consent_code")
    private String operationConsentCode;

    @Column(columnDefinition = "double precision default 0")
    private Double confirmedAmount;

    @Column(name = "sync_consent_code")
    private String syncConsentCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "credit_purpose", length = 20)
    private CreditPurpose creditPurpose = CreditPurpose.PERSONAL;


    // AJOUTÉ : Le champ 'advance' avec une valeur par défaut de 0
    @Column(name = "advance", columnDefinition = "double precision default 0")
    @PositiveOrZero
    private Double advance = 0.0;

    /** Termes financiers figés depuis une sync mobile (reçu déjà imprimé côté commercial). */
    @Column(name = "mobile_financial_terms_locked", columnDefinition = "boolean default false")
    private boolean mobileFinancialTermsLocked = false;

    /** Vente comptant encaissée, en attente de la remise magasin. */
    @Column(name = "pending_warehouse_delivery", nullable = false, columnDefinition = "boolean default false")
    private boolean pendingWarehouseDelivery = false;

    // ===== NOUVEAUX CHAMPS POUR BI DASHBOARD =====
    @Column(name = "profit_margin")
    private Double profitMargin; // Marge bénéficiaire = totalAmount - totalPurchase

    @Column(name = "profit_margin_percentage")
    private Double profitMarginPercentage; // (profitMargin / totalPurchase) * 100

    @PositiveOrZero
    @Column(name = "payment_completion_rate")
    private Double paymentCompletionRate; // (totalAmountPaid / totalAmount) * 100

    @PositiveOrZero
    @Column(name = "expected_duration_days")
    private Integer expectedDurationDays; // Durée prévue en jours

    @PositiveOrZero
    @Column(name = "actual_duration_days")
    private Integer actualDurationDays; // Durée réelle si terminé

    @PositiveOrZero
    @Column(name = "payment_regularity_score")
    private Double paymentRegularityScore; // Score de régularité des paiements (0-100)

    @Column(name = "risk_level")
    @Enumerated(EnumType.STRING)
    private RiskLevel riskLevel; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(name = "season_period")
    private String seasonPeriod; // Q1, Q2, Q3, Q4 ou mois

    @Column(name = "distribution_zone")
    private String distributionZone; // Zone géographique du commercial

    @Column(name = "customer_segment")
    private String customerSegment; // Segmentation client (nouveau, fidèle, VIP, etc.)

    /** Certification physique du carnet (distincte du contrôle terrain). */
    @Column(name = "carnet_verified", nullable = false)
    private Boolean carnetVerified = Boolean.FALSE;

    @Column(name = "carnet_verified_at")
    private LocalDateTime carnetVerifiedAt;

    @Column(name = "carnet_verified_by", length = 100)
    private String carnetVerifiedBy;

    @Transient
    private List<CreditSourceMonthlyStockDto> sourceMonthlyStocks = new ArrayList<>();

    /** Reliquat client disponible (enrichi à la lecture, non persisté). */
    @Transient
    private Double clientReliquatAmount;

    public Credit(Long creditId) {
        this.id = creditId;
    }

    @JsonIgnore
    public SaleType getSaleType() {
        return SaleType.fromOperationTypeOptional(this.type).orElse(null);
    }

    @JsonIgnore
    public boolean isCredit() {
        return SaleType.CREDIT == getSaleType();
    }

    @JsonIgnore
    public boolean isCash() {
        return SaleType.CASH == getSaleType();
    }

    @JsonIgnore
    public boolean isTontine() {
        return SaleType.TONTINE == getSaleType();
    }

    @JsonIgnore
    public SaleLifecyclePolicy lifecyclePolicy() {
        return SaleLifecyclePolicies.forCredit(this);
    }

    @PrePersist
    public void setUp() {
        // Le montant total des articles est calculé (sauf vente déjà démarrée ou sync mobile : montant figé)
        if (!mobileFinancialTermsLocked && !CreditArticleUnitPricePolicy.isUnitPriceFrozen(this.status)) {
            this.totalAmount = getTotalAmountByCalcul();
        }

        setCreditToCreditArticles();
        this.status = Objects.isNull(this.status) ? CreditStatus.CREATED : this.status;
        if (!mobileFinancialTermsLocked) {
            this.remainingDaysCount = resolveRemainingDaysCountOrDefault();
        }
        this.totalAmountPaid = this.totalAmountPaid == null ? 0D : totalAmountPaid;

    }


    @JsonIgnore
    public Double getTotalAmountByCalcul() {
        if (Objects.nonNull(articles) && !articles.isEmpty()) {
            this.totalPurchase = this.calculTotalPurchase();
            return articles.stream()
                    .mapToDouble(creditArticles -> {
                        if (creditArticles.getSaleLine() != null
                                && creditArticles.getSaleLine().getLineAmount() != null
                                && creditArticles.getSaleLine().getLineAmount() > 0) {
                            return creditArticles.getSaleLine().getLineAmount();
                        }
                        return resolveArticleLineUnitPrice(creditArticles) * creditArticles.getQuantity();
                    })
                    .sum();


        }
        if (Objects.nonNull(this.totalAmount)) {
            return this.totalAmount;
        }
        return 0D;
    }

    @JsonIgnore
    private double resolveArticleLineUnitPrice(CreditArticles creditArticles) {
        Double unitPrice = creditArticles.getUnitPrice();
        if (unitPrice != null && unitPrice > 0) {
            return unitPrice;
        }
        if (CreditArticleUnitPricePolicy.isUnitPriceFrozen(this.status)) {
            return 0D;
        }
        if (creditArticles.getArticles() == null) {
            return 0D;
        }
        return lifecyclePolicy().resolveFallbackUnitPrice(creditArticles);
    }

    @JsonIgnore
    public Double calculTotalPurchase() {
        if (Objects.nonNull(articles) && !articles.isEmpty()) {
            return this.totalPurchase = articles.stream()
                    .mapToDouble(creditArticles -> {
                        if (creditArticles.getSaleLine() != null
                                && creditArticles.getSaleLine().getLinePurchaseAmount() != null
                                && creditArticles.getSaleLine().getLinePurchaseAmount() > 0) {
                            return creditArticles.getSaleLine().getLinePurchaseAmount();
                        }
                        if (creditArticles.getUnitPurchaseCost() != null
                                && creditArticles.getUnitPurchaseCost() > 0) {
                            return creditArticles.getUnitPurchaseCost() * creditArticles.getQuantity();
                        }
                        return creditArticles.getArticles().getPurchasePrice() * creditArticles.getQuantity();
                    })
                    .sum();
        }
        return 0D;
    }

    // NOTE : La méthode getDailyStakeCalculated() n'est plus utilisée par setUp()
    @JsonIgnore
    public Double getDailyStakeCalculated() {
        if (Objects.nonNull(totalAmount) && totalAmount > 0) {
            return totalAmount / 30;
        }
        return 0D;
    }


    @JsonIgnore
    public CreditTimeline dailyStakeOperation(CreditTimeline creditTimeline) {
        if (totalAmountPaid < totalAmount) {
            this.totalAmountPaid += creditTimeline.getAmount();
            this.totalAmountRemaining = totalAmount - totalAmountPaid;
        }

        if (totalAmountRemaining == 0) {
            if (awaitingWarehouseDelivery()) {
                this.remainingDaysCount = 0;
                creditTimeline.dailyStakeOperation(this);
                this.dailyPaid = Boolean.TRUE;
                return creditTimeline;
            }
            this.remainingDaysCount = 0;
            this.client.setCreditInProgress(false);
            effectiveEndDate = LocalDate.now();
            status = CreditStatus.SETTLED;

            if (effectiveEndDate.isBefore(expectedEndDate)) {
                solvencyNote = SolvencyStatus.EARLY;
            } else if (effectiveEndDate.isAfter(expectedEndDate)) {
                solvencyNote = SolvencyStatus.LATE;
                lateDaysCount = Math.abs((int) ChronoUnit.DAYS.between(effectiveEndDate, expectedEndDate));
            } else {
                solvencyNote = SolvencyStatus.TIME;
            }
        }
        creditTimeline.dailyStakeOperation(this);
        this.dailyPaid = Boolean.TRUE;
        return creditTimeline;
    }
    public void checkAdvance() {
        lifecyclePolicy().initializeFinancialTerms(this);
    }

    public void changeDailyStake(@NotNull(message = "La mise journalière ne peut pas être nulle") @Positive(message = "La mise journelière doit avoir une valeur supérieure à 0") Double newDailyStake) {
        if (CreditStatus.SETTLED.equals(status)) {
            throw new CustomValidationException("La vente est déjà clôturée, on ne peut plus modifier sa mise journalière !!!");
        }
        if (newDailyStake < 200 && this.totalAmountRemaining > 200) {
            throw new CustomValidationException("La valeur de la mise journalière ne peut pas être inférieur à 200 FCFA !!!");
        }
        this.dailyStake = newDailyStake;
        double exactDays = this.totalAmountRemaining / this.dailyStake;
        this.remainingDaysCount = (int) Math.ceil(exactDays);
        if ((ChronoUnit.DAYS.between(this.beginDate, LocalDate.now().plusDays(this.remainingDaysCount)) > 30) && newDailyStake < this.totalAmountRemaining) {
            throw new CustomValidationException("La nouvelle mise de " + newDailyStake + " ne respecte pas le temps requis pour payer totalement le crédit, il faut augmenter la mise !!!");
        }
        this.expectedEndDate = LocalDate.now().plusDays(this.remainingDaysCount);
    }

    public void validate() {
        if (!CreditStatus.CREATED.equals(status)) {
            throw new ApplicationException("Le statut du credit est invalide pour le validé !!!");
        }
        this.status= CreditStatus.VALIDATED;
    }

    public boolean awaitingWarehouseDelivery() {
        return isCash() && pendingWarehouseDelivery;
    }

    public void settleAfterWarehouseDelivery() {
        this.pendingWarehouseDelivery = false;
        this.remainingDaysCount = 0;
        LocalDate end = LocalDate.now();
        this.effectiveEndDate = end;
        this.status = CreditStatus.SETTLED;
        if (expectedEndDate != null && end.isBefore(expectedEndDate)) {
            solvencyNote = SolvencyStatus.EARLY;
        } else if (expectedEndDate != null && end.isAfter(expectedEndDate)) {
            solvencyNote = SolvencyStatus.LATE;
            lateDaysCount = Math.abs((int) ChronoUnit.DAYS.between(end, expectedEndDate));
        } else {
            solvencyNote = SolvencyStatus.TIME;
        }
        this.dailyPaid = Boolean.TRUE;
    }

    public void start() {
        SaleLifecyclePolicy policy = lifecyclePolicy();
        policy.validateBeforeStart(this);
        LocalDate now = LocalDate.now();
        if (mobileFinancialTermsLocked) {
            LocalDate effectiveBeginDate = this.beginDate != null ? this.beginDate : now;
            this.setAccountingDate(effectiveBeginDate);
            this.setReleaseDate(effectiveBeginDate);
        } else {
            this.setAccountingDate(now);
            this.setReleaseDate(now);
        }
        this.status = policy.statusOnStart(this);
        policy.configureStartSchedule(this, now);
    }

    @JsonIgnore
    private int resolveRemainingDaysCountOrDefault() {
        return this.remainingDaysCount != null ? this.remainingDaysCount : 30;
    }

    public void checkInProgressStatus() {
        SaleType saleType = getSaleType();
        if (saleType != null) {
            SaleLifecyclePolicies.forType(saleType).assertInProgressForRecovery(this);
        }
    }

    public void checkStartStatus() {
        if (!CreditStatus.INPROGRESS.equals(status)) {
            throw new ApplicationException("Cette vente doit être livré avant la distribution  !");
        }
    }

    public Long getClientId() {
        if (Objects.nonNull(client)) {
            return client.getId();
        }
        return null;
    }

    public void setCreditToCreditArticles() {
        if (Objects.nonNull(articles)) {
            articles.forEach(article -> article.setCredit(this));
        }
    }

    @Override
    public final boolean equals(Object o) {
        if (this == o) return true;
        if (o == null) return false;
        Class<?> oEffectiveClass = o instanceof HibernateProxy hibernateProxy ? hibernateProxy.getHibernateLazyInitializer().getPersistentClass() : o.getClass();
        Class<?> thisEffectiveClass = this instanceof HibernateProxy hibernateProxy ? hibernateProxy.getHibernateLazyInitializer().getPersistentClass() : this.getClass();
        if (thisEffectiveClass != oEffectiveClass) return false;
        Credit credit = (Credit) o;
        return getId() != null && Objects.equals(getId(), credit.getId());
    }

    @Override
    public final int hashCode() {
        return this instanceof HibernateProxy hibernateProxy ? hibernateProxy.getHibernateLazyInitializer().getPersistentClass().hashCode() : getClass().hashCode();
    }

    public void supportedBackToStoreOperation() {
        if (isClientCredit() || Boolean.FALSE.equals(updatable)) {
            throw new CustomValidationException("Opération non autorisé pour cette vente !");
        }
    }

    public boolean isClientCredit() {
        return ClientType.CLIENT.equals(this.clientType) && isCredit();
    }
    public void addNewArticles(Set<CreditArticles> creditArticles) {
        if ( Objects.isNull(creditArticles)) {
            throw new CustomValidationException("Impossible d'enregistrer les nouveaux articles pour la vente");
        }

        // Initialiser l'ensemble s'il est null (normalement déjà fait par le constructeur)
        if (this.articles == null) {
            this.articles = new HashSet<>();
        }

        // Parcourir les nouveaux articles à ajouter
        for (CreditArticles newArticle : creditArticles) {
            boolean articleExisteDeja = false;

            // Chercher si l'article existe déjà dans la collection
            for (CreditArticles existingArticle : this.articles) {
                if (existingArticle.getArticles().getId().equals(newArticle.getArticles().getId())) {
                    // L'article existe déjà, on incrémente la quantité
                    Integer nouvelleQuantite = existingArticle.getQuantity() + newArticle.getQuantity();
                    existingArticle.setQuantity(nouvelleQuantite);
                    articleExisteDeja = true;
                    break;
                }
            }

            // Si l'article n'existe pas encore, on l'ajoute
            if (!articleExisteDeja) {
                this.articles.add(newArticle);
            }
        }

        // Mettre à jour les montants et autres propriétés
        this.totalAmount = getTotalAmountByCalcul();
        if (isCredit()) {
            this.remainingDaysCount = this.remainingDaysCount == null ? 30 : remainingDaysCount;
            this.totalAmountPaid = this.totalAmountPaid == null ? 0D : totalAmountPaid;
            this.checkAdvance();
        }
        this.setCreditToCreditArticles();
    }

    public Double getTotalAmountRemaining() {
        if (Objects.isNull(this.totalAmountRemaining)) {
            return 0D;
        }
        return this.totalAmountRemaining;
    }

    public Double getTotalAmount() {
        if (Objects.isNull(this.totalAmount)) {
            return 0D;
        }
        return this.totalAmount;
    }

    public Double getTotalAmountPaid() {
        if (Objects.isNull(this.totalAmountPaid)) {
            return 0D;
        }
        return this.totalAmountPaid;
    }

    public Double getTotalPurchase() {
        if (Objects.isNull(this.totalPurchase)) {
            return 0D;
        }
        return this.totalPurchase;
    }

    public void tontineBuilder() {
        this.clientType = ClientType.PROMOTER;
        this.type = OperationType.TONTINE;
        this.dailyPaid = true;
        this.dailyStake = totalAmount;
        this.expectedEndDate = LocalDate.of(LocalDate.now().getYear(), 12, 31);
        this.effectiveEndDate = this.expectedEndDate;
        this.updatable = Boolean.TRUE;
        this.beginDate = LocalDate.now();
        this.lateDaysCount = 0;
        this.remainingDaysCount = 0;
        this.advance = 0.0;
        this.solvencyNote = SolvencyStatus.TIME;
        this.totalAmountRemaining = 0.0;
        this.totalAmountPaid = 0.0;
        this.status = CreditStatus.CREATED;
    }

    public void addClient(Client client) {
        this.client = client;
        this.clientType = client.getClientType();
        this.collector = client.getCollector();
    }

    public void addTontine(Credit tontine) {
        this.totalAmount += tontine.getTotalAmountByCalcul();
        this.totalPurchase += tontine.getTotalPurchase();
    }

    public static Credit newCredit(
            Client client,
            Set<CreditArticles> articles,
            Double advance,
            CreditPurpose purpose) {
        Credit credit = new Credit();
        credit.setType(OperationType.CREDIT);
        credit.setStatus(CreditStatus.CREATED);
        credit.setClient(client);
        if (client != null) {
            credit.setClientType(client.getClientType() != null ? client.getClientType() : ClientType.CLIENT);
            credit.setCollector(client.getCollector());
        } else {
            credit.setClientType(ClientType.CLIENT);
        }
        credit.setArticles(articles != null ? new HashSet<>(articles) : new HashSet<>());
        credit.setCreditToCreditArticles();
        credit.setAdvance(advance != null && advance > 0 ? advance : 0.0);
        credit.setCreditPurpose(purpose != null ? purpose : CreditPurpose.PERSONAL);
        return credit;
    }

    public static Credit newCashSale(
            Client client,
            String collector,
            String agencyCommercial,
            Set<CreditArticles> articles,
            LocalDate saleDate) {
        LocalDate effectiveDate = saleDate != null ? saleDate : LocalDate.now();
        Credit credit = new Credit();
        credit.setType(OperationType.CASH);
        credit.setClient(client);
        credit.setClientType(ClientType.CLIENT);
        credit.setCollector(collector);
        credit.setAgencyCommercial(agencyCommercial);
        credit.setArticles(articles != null ? new HashSet<>(articles) : new HashSet<>());
        credit.setCreditToCreditArticles();
        credit.initializeAsPendingCashSale(effectiveDate);
        return credit;
    }

    public void initializeAsPendingCashSale(LocalDate saleDate) {
        LocalDate effectiveDate = saleDate != null ? saleDate : LocalDate.now();
        this.type = OperationType.CASH;
        this.totalAmount = this.getTotalAmountByCalcul();
        this.advance = 0.0;
        this.totalAmountPaid = this.totalAmount;
        this.totalAmountRemaining = 0.0;
        this.dailyStake = this.totalAmount;
        this.remainingDaysCount = 0;
        this.beginDate = effectiveDate;
        this.expectedEndDate = effectiveDate;
        this.effectiveEndDate = null;
        this.status = CreditStatus.VALIDATED;
        this.pendingWarehouseDelivery = true;
    }

    public static Credit newTontineSale(
            Client client,
            String collector,
            double totalAmount,
            double totalPurchase,
            Set<CreditArticles> articles,
            LocalDate saleDate) {
        LocalDate effectiveDate = saleDate != null ? saleDate : LocalDate.now();
        Credit credit = new Credit();
        credit.setType(OperationType.TONTINE);
        credit.setStatus(CreditStatus.SETTLED);
        credit.setTotalAmount(totalAmount);
        credit.setTotalAmountPaid(totalAmount);
        credit.setTotalAmountRemaining(0.0);
        credit.setTotalPurchase(totalPurchase);
        credit.setDailyStake(totalAmount);
        credit.setBeginDate(effectiveDate);
        credit.setExpectedEndDate(effectiveDate);
        credit.setEffectiveEndDate(effectiveDate);
        credit.setSolvencyNote(SolvencyStatus.TIME);
        credit.setRemainingDaysCount(0);
        credit.setDailyPaid(true);
        credit.setClientType(ClientType.CLIENT);
        credit.setUpdatable(false);
        credit.setClient(client);
        credit.setCollector(collector);
        credit.setArticles(articles != null ? new HashSet<>(articles) : new HashSet<>());
        credit.setCreditToCreditArticles();
        return credit;
    }

    public static Credit buildDistribution(Client client, DistributeArticleDto dto) {
        Credit credit = new Credit();
        credit.setType(OperationType.CREDIT);
        credit.setClient(client);
        credit.setArticles(CreditArticles.from(dto.getArticles()));
        credit.setCreditToCreditArticles();
        credit.setAdvance(dto.getAdvance());
        if (Objects.nonNull(dto.getMobile()) && Boolean.TRUE.equals(dto.getMobile())) {
            credit.applyMobileFinancialTerms(dto);
        }
        credit.setOperationConsentCode(dto.getOperationConsentCode());
        credit.setConfirmedAmount(dto.getConfirmedAmount());
        credit.setSyncConsentCode(dto.getSyncConsentCode());
        if (dto.getCreditPurpose() != null) {
            credit.setCreditPurpose(dto.getCreditPurpose());
        }
        return credit;
    }

    /**
     * Applique les termes financiers calculés et imprimés sur le mobile (mise, avance, échéance).
     * Ne recalcule pas la mise sur la base du montant restant / 30 jours.
     */
    public void applyMobileFinancialTerms(DistributeArticleDto dto) {
        if (dto.getTotalAmount() == null || dto.getTotalAmount() <= 0) {
            throw new CustomValidationException("Le montant total de la distribution mobile est invalide.");
        }
        if (dto.getDailyStake() == null || dto.getDailyStake() <= 0) {
            throw new CustomValidationException("La mise journalière de la distribution mobile est invalide.");
        }

        this.mobileFinancialTermsLocked = true;
        this.totalAmount = dto.getTotalAmount();
        this.dailyStake = dto.getDailyStake();
        double advance = dto.getAdvance() != null ? dto.getAdvance() : 0.0;
        if (advance < 0 || advance > dto.getTotalAmount()) {
            throw new CustomValidationException("L'avance de la distribution mobile est invalide.");
        }
        this.advance = advance;
        // À la création mobile, seul l'avance doit alimenter totalAmountPaid.
        // Les recouvrements (CreditTimeline) seront synchronisés séparément.
        this.totalAmountPaid = advance;
        this.totalAmountRemaining = dto.getTotalAmount() - advance;
        if (this.totalAmountRemaining < 0) {
            throw new CustomValidationException("Le montant restant de la distribution mobile est invalide.");
        }
        this.beginDate = dto.getStartDate() != null ? dto.getStartDate() : LocalDate.now();
        if (dto.getEndDate() != null) {
            this.expectedEndDate = dto.getEndDate();
            this.remainingDaysCount = Math.max(0, (int) ChronoUnit.DAYS.between(this.beginDate, dto.getEndDate()));
        } else if (this.totalAmountRemaining > 0) {
            this.remainingDaysCount = (int) Math.ceil(this.totalAmountRemaining / this.dailyStake);
            this.expectedEndDate = this.beginDate.plusDays(this.remainingDaysCount);
        } else {
            this.remainingDaysCount = 0;
            this.expectedEndDate = this.beginDate;
        }
    }
}