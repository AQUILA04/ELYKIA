package com.optimize.elykia.client.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.common.entities.enums.State;
import com.optimize.common.entities.exception.ApplicationException;
import com.optimize.elykia.client.enumeration.AccountStatus;
import com.optimize.elykia.client.enumeration.ClientType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.SQLRestriction;
import org.hibernate.annotations.Where;
import org.hibernate.proxy.HibernateProxy;

import java.time.LocalDate;
import java.util.Objects;

@Entity
@Getter
@Setter
@ToString
@Where(clause = "visibility <> 'DELETED'")
//@SQLRestriction(value = "visibility <> 'DELETED'")
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
    private String tontineCollector;
    private String agencyCollector;
    private String recoveryCollector;
    @Column(columnDefinition = "boolean default false")
    private boolean isTontineMember;


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
}
