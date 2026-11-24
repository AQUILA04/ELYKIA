package com.optimize.elykia.client.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.common.entities.exception.CustomValidationException;
import com.optimize.elykia.client.enumeration.AccountStatus;
import com.optimize.elykia.client.enumeration.ClientActivationStatus;
import com.optimize.elykia.client.enumeration.ClientRegistrationSource;
import com.optimize.elykia.client.enumeration.ClientType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.proxy.HibernateProxy;

import java.time.LocalDate;
import java.util.Objects;

@Entity
@Getter
@Setter
@ToString
@SQLRestriction("visibility <> 'DELETED'")
public class Client extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String firstname;
    private String lastname;
    private String address;
    private String phone;
    private String cardID;
    private String cardType;
    private LocalDate dateOfBirth;
    @ToString.Exclude
    private byte[] IDDoc;
    private String contactPersonName;
    private String contactPersonPhone;
    private String contactPersonAddress;
    private String collector;
    private String quarter;

    /** Vrai si le quartier a été saisi librement (option « AUTRES ») et n'est pas encore une localité. */
    @Column(name = "custom_quarter", nullable = false)
    private boolean customQuarter = false;

    private Boolean creditInProgress;
    @ToString.Exclude
    @OneToOne(mappedBy = "client", cascade = CascadeType.ALL)
    @JsonIgnore
    private Account account;
    private String occupation;
    @Enumerated(EnumType.STRING)
    private ClientType clientType;
    private Double latitude;
    private Double longitude;
    private String mll;
    @ToString.Exclude
    private byte[] profilPhoto;
    private LocalDate syncDate;
    private String code;
    private String profilPhotoUrl;
    private String cardPhotoUrl;
    private String profilPhotoThumbUrl;
    private String cardPhotoThumbUrl;
    private String tontineCollector;
    private String agencyCollector;
    /** @deprecated Utiliser {@link #recoveryCommercialUsername}. */
    @Deprecated(since = "2.14.0", forRemoval = true)
    private String recoveryCollector;

    @Column(name = "commercial_username")
    private String commercialUsername;

    @Column(name = "credit_commercial_username")
    private String creditCommercialUsername;

    @Column(name = "tontine_commercial_username")
    private String tontineCommercialUsername;

    @Column(name = "agency_commercial_username")
    private String agencyCommercialUsername;

    @Column(name = "recovery_commercial_username")
    private String recoveryCommercialUsername;

    public void setCommercialUsername(String commercialUsername) {
        this.commercialUsername = commercialUsername;
        this.creditCommercialUsername = commercialUsername;
        this.collector = commercialUsername;
    }

    public String getCommercialUsername() {
        return commercialUsername != null ? commercialUsername : (creditCommercialUsername != null ? creditCommercialUsername : collector);
    }

    public void setCreditCommercialUsername(String creditCommercialUsername) {
        this.creditCommercialUsername = creditCommercialUsername;
        this.commercialUsername = creditCommercialUsername;
        this.collector = creditCommercialUsername;
    }

    public String getCreditCommercialUsername() {
        return creditCommercialUsername != null ? creditCommercialUsername : (commercialUsername != null ? commercialUsername : collector);
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setCollector(String collector) {
        this.collector = collector;
        this.commercialUsername = collector;
        this.creditCommercialUsername = collector;
    }

    public void setTontineCommercialUsername(String tontineCommercialUsername) {
        this.tontineCommercialUsername = tontineCommercialUsername;
        this.tontineCollector = tontineCommercialUsername;
    }

    public String getTontineCommercialUsername() {
        return tontineCommercialUsername != null ? tontineCommercialUsername : tontineCollector;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setTontineCollector(String tontineCollector) {
        this.tontineCollector = tontineCollector;
        this.tontineCommercialUsername = tontineCollector;
    }

    public void setAgencyCommercialUsername(String agencyCommercialUsername) {
        this.agencyCommercialUsername = agencyCommercialUsername;
        this.agencyCollector = agencyCommercialUsername;
    }

    public String getAgencyCommercialUsername() {
        return agencyCommercialUsername != null ? agencyCommercialUsername : agencyCollector;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setAgencyCollector(String agencyCollector) {
        this.agencyCollector = agencyCollector;
        this.agencyCommercialUsername = agencyCollector;
    }

    public void setRecoveryCommercialUsername(String recoveryCommercialUsername) {
        this.recoveryCommercialUsername = recoveryCommercialUsername;
        this.recoveryCollector = recoveryCommercialUsername;
    }

    public String getRecoveryCommercialUsername() {
        return recoveryCommercialUsername != null ? recoveryCommercialUsername : recoveryCollector;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setRecoveryCollector(String recoveryCollector) {
        this.recoveryCollector = recoveryCollector;
        this.recoveryCommercialUsername = recoveryCollector;
    }
    @Column(columnDefinition = "boolean default false")
    private boolean isTontineMember;
    @Column(columnDefinition = "boolean default false")
    private boolean hasOrderInProgress;

    @Column(name = "business_credit_in_progress", columnDefinition = "boolean default false")
    private boolean businessCreditInProgress = false;

    @Column(name = "business_credit_authorized", columnDefinition = "boolean default false")
    private boolean businessCreditAuthorized = false;

    @Column(name = "business_credit_authorized_by")
    private String businessCreditAuthorizedBy;

    @Column(name = "business_credit_authorized_at")
    private java.time.LocalDateTime businessCreditAuthorizedAt;

    @Column(name = "event_credit_in_progress", columnDefinition = "boolean default false")
    private boolean eventCreditInProgress = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "activation_status", nullable = false, length = 20)
    private ClientActivationStatus activationStatus = ClientActivationStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "registration_source", nullable = false, length = 30)
    private ClientRegistrationSource registrationSource = ClientRegistrationSource.STAFF;

    @Column(name = "activation_rejection_reason", length = 500)
    private String activationRejectionReason;

    @Column(name = "activation_rejected_by", length = 100)
    private String activationRejectedBy;

    @Column(name = "activation_rejected_at")
    private java.time.LocalDateTime activationRejectedAt;

    public Long getAccountId() {
        if (Objects.nonNull(account)) {
            return account.getId();
        }
        return null;
    }

    public String getFullName() {
        return firstname + " " + lastname;
    }


    public void hasValidAccount() {
        if (Objects.nonNull(getAccountId()) && !AccountStatus.ACTIF.equals(account.getStatus())) {
            throw new ApplicationException("Le compte du client n'est pas actif !");
        }
    }

    public boolean isActivationPending() {
        return ClientActivationStatus.PENDING.equals(activationStatus);
    }

    public boolean isActivationRejected() {
        return ClientActivationStatus.REJECTED.equals(activationStatus);
    }

    public boolean isActivationActive() {
        return activationStatus == null || ClientActivationStatus.ACTIVE.equals(activationStatus);
    }

    public void allowCreditAmountControl(Double amount, int dividend) {
        if (Objects.isNull(this.account) || ((amount / dividend) > this.account.getAccountBalance())) {
            throw new ApplicationException("Le montant du credit dépasse le montant autorisé pour ce client");
        }
    }

    @Override
    public final boolean equals(Object o) {
        if (this == o) return true;
        if (o == null) return false;
        Class<?> oEffectiveClass = o instanceof HibernateProxy ? ((HibernateProxy) o).getHibernateLazyInitializer().getPersistentClass() : o.getClass();
        Class<?> thisEffectiveClass = this instanceof HibernateProxy ? ((HibernateProxy) this).getHibernateLazyInitializer().getPersistentClass() : this.getClass();
        if (thisEffectiveClass != oEffectiveClass) return false;
        Client client = (Client) o;
        return getId() != null && Objects.equals(getId(), client.getId());
    }

    @Override
    public final int hashCode() {
        return this instanceof HibernateProxy ? ((HibernateProxy) this).getHibernateLazyInitializer().getPersistentClass().hashCode() : getClass().hashCode();
    }

    @JsonIgnore
    public byte[] getIDDoc() {
        return IDDoc;
    }

    public void becomeTontineMember() {
        this.isTontineMember = Boolean.TRUE;
    }

    public void finishTontine() {
        this.isTontineMember = Boolean.FALSE;
    }
    
    public boolean isSameClient(Client client) {
        if (client == null) {
            return false;
        }
        return Objects.equals(this.firstname, client.getFirstname()) &&
               Objects.equals(this.lastname, client.getLastname());
    }

    public void removePhotos() {
        this.profilPhoto = null;
        this.IDDoc = null;
    }

    public void validateClientOperation() {
        if (ClientType.PROMOTER.equals(this.clientType)) {
            throw new CustomValidationException("Opération non disponible pour ce type de client !");
        }
    }
}
