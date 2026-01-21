package com.optimize.common.securities.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Table(name = "UACC_PERMS", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"ACCID", "PERMID"})
})
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AccountPermission implements Serializable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "UACC_PERMS_ID")
    private Long id;
    @JoinColumn(name = "ACCID")
    @ManyToOne
    @JsonIgnore
    private UserAccount userAccount;
    @JoinColumn(name = "PERMID", referencedColumnName = "PERMID")
    @ManyToOne
    @JsonIgnore
    private UserPermission userPermission;


    public void setPKId(Long accountId, Long permissionId) {
        this.setUserAccount(new UserAccount(accountId));
        this.setUserPermission(new UserPermission(permissionId));
    }

    public AccountPermission(Long accountId, Long permissionId) {
        setPKId(accountId, permissionId);
    }

    public AccountPermission(UserAccount userAccount, UserPermission userPermission) {
        this.userAccount = userAccount;
        this.userPermission = userPermission;
    }

}
