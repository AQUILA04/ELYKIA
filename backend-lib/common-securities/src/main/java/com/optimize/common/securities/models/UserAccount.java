package com.optimize.common.securities.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.proxy.HibernateProxy;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

@Entity
@Getter
@Setter
@Table(name = "UACC")
@NoArgsConstructor
public class UserAccount extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ACCID")
    private Long id;

    @NotBlank
    @Size(max = 20)
    @Column(name = "ACCUSER")
    private String username;

    @NotBlank
    @Size(max = 120)
    @Column(name = "ACCPASS")
    private String password;

    private Boolean active = Boolean.FALSE;
    @JsonIgnore
    @Size(max = 20)
    private String activationKey;
    @Size(max = 20)
    private String passwordUpdateKey;

    @JsonIgnore
    private LocalDateTime passwordUpdateTime;
    private Integer failedConnexionAttempt;

    @ManyToOne(cascade = CascadeType.MERGE)
    @JoinColumn(name = "PROID", nullable = false)
    private UserProfil userProfil;
    @JsonIgnore
    @OneToMany(mappedBy = "userAccount", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<AccountPermission> permissions = new HashSet<>();

    public UserAccount(Long accountId) {
        this.id = accountId;
    }


    @PrePersist
    public void setUp() {
        if (Objects.nonNull(userProfil)) {
            userProfil.getProfilPermissions()
                    .forEach(permission -> permissions.add(new AccountPermission(this, permission.getUserPermission())));
        }
//        if (Objects.nonNull(userProfil)) {
//            userProfil.setUserAccounts(Set.of(this));
//        }
    }

    public Long getUserProfilId() {
        if (Objects.nonNull(userProfil)) {
            return userProfil.getId();
        }
        return null;
    }


    @Override
    public final boolean equals(Object o) {
        if (this == o) return true;
        if (o == null) return false;
        Class<?> oEffectiveClass = o instanceof HibernateProxy ? ((HibernateProxy) o).getHibernateLazyInitializer().getPersistentClass() : o.getClass();
        Class<?> thisEffectiveClass = this instanceof HibernateProxy ? ((HibernateProxy) this).getHibernateLazyInitializer().getPersistentClass() : this.getClass();
        if (thisEffectiveClass != oEffectiveClass) return false;
        UserAccount that = (UserAccount) o;
        return getId() != null && Objects.equals(getId(), that.getId());
    }

    @Override
    public final int hashCode() {
        return this instanceof HibernateProxy ? ((HibernateProxy) this).getHibernateLazyInitializer().getPersistentClass().hashCode() : getClass().hashCode();
    }

    public String getProfileName() {
        if (Objects.nonNull(userProfil)) {
            return userProfil.getName();
        }
        return null;
    }
}
