package com.optimize.elykia.core.entity.sale;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.entity.Client;
import com.optimize.elykia.client.enumeration.ClientType;
import com.optimize.elykia.core.entity.tontine.TontineDelivery;
import com.optimize.elykia.core.enumaration.CreditStatus;
import com.optimize.elykia.core.enumaration.OperationType;
import com.optimize.elykia.core.enumaration.RiskLevel;
import com.optimize.elykia.core.enumaration.SolvencyStatus;
import com.optimize.elykia.core.util.MoneyUtil;
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
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
public class Credit extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
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
    @Positive
    private Double dailyStake;
    @Enumerated(EnumType.STRING)
    private CreditStatus status;
    @PositiveOrZero
    private Integer remainingDaysCount;
    private String collector;
    @Enumerated(EnumType.STRING)
    private OperationType type;
    @Column(columnDefinition = "boolean default false")
    private Boolean dailyPaid = false;
    @Enumerated(EnumType.STRING)
    private ClientType clientType;
    @Deprecated
    @ManyToOne
    private Credit parent;
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
    private String agencyCommercial;


    // AJOUTÉ : Le champ 'advance' avec une valeur par défaut de 0
    @Column(name = "advance", columnDefinition = "double precision default 0")
    @PositiveOrZero
    private Double advance = 0.0;

    // ===== NOUVEAUX CHAMPS POUR BI DASHBOARD =====
    @Column(name = "profit_margin")
    @PositiveOrZero
    private Double profitMargin; // Marge bénéficiaire = totalAmount - totalPurchase

    @PositiveOrZero
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

    public Credit(Long creditId) {
        this.id = creditId;
    }

    @PrePersist
    public void setUp() {
        // Le montant total des articles est calculé
            this.totalAmount = getTotalAmountByCalcul();
        // --- LOGIQUE DE L'AVANCE MODIFIÉE ---


        setCreditToCreditArticles();
        this.status = Objects.isNull(this.status) ? CreditStatus.CREATED : this.status;
        this.remainingDaysCount = this.remainingDaysCount == null ? 30: remainingDaysCount;
        this.totalAmountPaid = this.totalAmountPaid == null ? 0D : totalAmountPaid;

    }


    @JsonIgnore
    public Double getTotalAmountByCalcul() {
        if (Objects.nonNull(articles) && !articles.isEmpty()) {
            this.totalPurchase = this.calculTotalPurchase();
            if (OperationType.CREDIT.equals(this.type)) {
                if (Objects.nonNull(this.status) && List.of(CreditStatus.CREATED, CreditStatus.VALIDATED).contains(this.status)) {
                    return articles.stream()
                            .mapToDouble(creditArticles ->
                                    (creditArticles.getArticles().getCreditSalePrice() * creditArticles.getQuantity()))
                            .sum();
                } else {
                    return articles.stream()
                            .mapToDouble(creditArticles ->
                                    (creditArticles.
                                            getUnitPrice() * creditArticles.getQuantity()))
                            .sum();
                }
            } else if (OperationType.CASH.equals(this.type)) {
                return articles.stream()
                        .mapToDouble(creditArticles ->
                                (creditArticles.
                                        getUnitPrice() * creditArticles.getQuantity()))
                        .sum();
            } else {
                return articles.stream()
                        .mapToDouble(creditArticles ->
                                (creditArticles.
                                        getUnitPrice() * creditArticles.getQuantity()))
                        .sum();
            }


        }
        if (Objects.nonNull(this.totalAmount)) {
            return this.totalAmount;
        }
        return 0D;
    }

    @JsonIgnore
    public Double calculTotalPurchase() {
        if (Objects.nonNull(articles) && !articles.isEmpty()) {
            return this.totalPurchase = articles.stream()
                    .mapToDouble(creditArticles ->
                            (creditArticles
                                    .getArticles()
                                    .getPurchasePrice() * creditArticles.getQuantity()))
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
        // 1. On récupère l'avance (0 si elle est nulle)
        if (List.of(CreditStatus.CREATED, CreditStatus.VALIDATED).contains(status)) {
            if(this.beginDate == null){
                this.beginDate = LocalDate.now();
            }

            if (OperationType.CASH.equals(this.type)) {
                this.totalAmountPaid = this.totalAmount;
                this.totalAmountRemaining = 0.0;
                this.advance = 0.0;
                this.remainingDaysCount = 0;
                this.expectedEndDate = this.beginDate;
                return;
            }

            this.advance = (this.advance != null && this.advance > 0) ? this.advance : 0.0;

            // 2. Le montant restant est le total MOINS l'avance
            this.totalAmountRemaining = this.totalAmount - this.advance;
            this.totalAmountPaid = this.advance;

            // 3. Calcul de la mise journalière brute (montant restant / 30 jours)
            double rawDailyStake = this.totalAmountRemaining / 30;

            // 4. Ajustement de la mise selon les règles métier
            this.dailyStake = MoneyUtil.calculateDailyStake(rawDailyStake);

            // 5. Recalcul du nombre de jours restants basé sur la mise ajustée
            double exactDays = this.totalAmountRemaining / this.dailyStake;
            this.remainingDaysCount = (int) Math.ceil(exactDays); // Arrondi par excès

            // 6. Recalcul de la date de fin attendue
            this.expectedEndDate = beginDate.plusDays(this.remainingDaysCount);
        }


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

    public void start() {
        if (OperationType.CREDIT.equals(this.type)) {
            if (!CreditStatus.VALIDATED.equals(status)) {
                throw new ApplicationException("Le statut du credit est invalide pour le démarré");
            }
            this.status= CreditStatus.INPROGRESS;
            this.expectedEndDate = LocalDate.now().plusDays(30);
            this.beginDate = LocalDate.now();
        } else if (ClientType.PROMOTER.equals(this.clientType)) {
            this.status = CreditStatus.INPROGRESS;
        } else {
            this.status = CreditStatus.SETTLED;
        }
    }

    public void checkInProgressStatus() {
        if (!CreditStatus.INPROGRESS.equals(status)) {
            throw new ApplicationException("Le statut de la vente doit être encours pour faire une mise journalière !");
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
        if (!isPromoterCredit() || Boolean.FALSE.equals(updatable)) {
            throw new CustomValidationException("Opération non autorisé pour cette vente !");
        }
    }

    public boolean isPromoterCredit() {
        return ClientType.PROMOTER.equals(this.clientType);
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
        if (OperationType.CREDIT.equals(this.type)) {
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

    public static Credit buildFromDelivery(TontineDelivery delivery) {
        Credit credit = new Credit();
        // 1. OperationType = TONTINE
        credit.setType(OperationType.TONTINE);
        // 2. status = SETTLED
        credit.setStatus(CreditStatus.SETTLED);
        // 3. totalAmount = delivery.getTotalAmount()
        credit.setTotalAmount(delivery.getTotalAmount());
        // 4. totalAmountPaid = delivery.getTotalAmount()
        credit.setTotalAmountPaid(delivery.getTotalAmount());
        // 5. totalAmountRemaining = 0
        credit.setTotalAmountRemaining(0.0);
        // 6. totalPurchase = Calculer la somme des purchasePrice des TontineDeliveryItem.
        double totalPurchase = delivery.getItems().stream()
                .mapToDouble(item -> item.getQuantity() * item.getArticles().getPurchasePrice()) // Assuming unitPrice is purchase price
                .sum();
        credit.setTotalPurchase(totalPurchase);
        // 7. dailyStake = delivery.getTotalAmount()
        credit.setDailyStake(delivery.getTotalAmount());
        // 8. Toutes les dates (beginDate, expectedEndDate, effetiveEndDate) = LocalDate.now()
        LocalDate today = LocalDate.now();
        credit.setBeginDate(today);
        credit.setExpectedEndDate(today);
        credit.setEffectiveEndDate(today);
        // 9. solvencyNote = TIME
        credit.setSolvencyNote(SolvencyStatus.TIME);
        // 10. remainingDaysCount = 0
        credit.setRemainingDaysCount(0);
        // 11. dailyPaid = true
        credit.setDailyPaid(true);
        // 12. clientType = CLIENT
        credit.setClientType(ClientType.CLIENT);
        // 13. updatable = false
        credit.setUpdatable(false);
        credit.setClient(delivery.getTontineMember().getClient());
        // 17. collector = delivery.getTontineMember().getClient().getCollector()
        credit.setCollector(delivery.getTontineMember().getClient().getCollector());
        // Set CreditArticles from TontineDeliveryItems
        final Credit finalCredit = credit;
        Set<CreditArticles> creditArticles = delivery.getItems().stream()
                .map(tontineDeliveryItem -> {
                    CreditArticles ca = new CreditArticles();
                    ca.setArticles(tontineDeliveryItem.getArticles());
                    ca.setQuantity(tontineDeliveryItem.getQuantity());
                    ca.setUnitPrice(tontineDeliveryItem.getUnitPrice());
                    ca.setCredit(finalCredit); // Link back to the credit
                    return ca;
                })
                .collect(Collectors.toSet());
        credit.setArticles(creditArticles);

        return credit;
    }
}