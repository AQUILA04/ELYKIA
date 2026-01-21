package com.optimize.common.securities.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Objects;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "UPRO_PERMS", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"PROID", "PERMID"})
})
public class ProfilPermission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "UPRO_PERMS_ID")
    private Long id;
    @JoinColumn(name = "PROID", referencedColumnName = "PROID")
    @ManyToOne
    private UserProfil userProfil;
    @ManyToOne
    @JoinColumn(name = "PERMID", referencedColumnName = "PERMID")
    private UserPermission userPermission;

    public void setPKId(Long profilId, Long permissionId) {
        this.setUserProfil(new UserProfil(profilId));
        this.setUserPermission(new UserPermission(permissionId));
    }

    public ProfilPermission(Long profilId, Long permissionId) {
        setPKId(profilId, permissionId);
    }

    public ProfilPermission(UserProfil userProfil, UserPermission userPermission) {
        this.userProfil = userProfil;
        this.userPermission = userPermission;
    }

}
