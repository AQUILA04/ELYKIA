package com.optimize.common.securities.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.common.entities.enums.State;
import jakarta.persistence.*;
import lombok.*;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Getter
@Setter
@ToString
@Table(name = "UPERM")
@NoArgsConstructor
@AllArgsConstructor
public class UserPermission extends BaseEntity<String> implements Cloneable{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "PERMID")
    private Long id;
    @Column(name = "PERMNAM")
    private String name;
    @Column(name = "PERMDFLTNAM")
    private String defaultName;
    @OneToMany(mappedBy = "userPermission")
    @ToString.Exclude
    @JsonIgnore
    private Set<ProfilPermission> profilPermissions = new HashSet<>();

    public UserPermission(String permissionName, boolean initializer) {
        this.name = permissionName;
        this.defaultName = permissionName;
        if (initializer) {
            this.createdBy = "System";
            this.state = State.ENABLED;
        }
    }

    public UserPermission(String permissionName) {
        this.name = permissionName;
        this.defaultName = permissionName;
    }

    public UserPermission(Long id) {
        this.id = id;
    }

    static Set<UserPermission> getPermissionsByNames(Set<String> permissionNames) {
        return permissionNames.stream().map(permission -> {
            UserPermission auth = new UserPermission();
            auth.setName(permission);
            return auth;
        }).collect(Collectors.toSet());
    }


    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        UserPermission that = (UserPermission) o;
        return Objects.equals(name, that.name) && Objects.equals(defaultName, that.defaultName);
    }

    @Override
    public int hashCode() {
        return Objects.hash(name, defaultName);
    }

    @Override
    public UserPermission clone() {
        try {
            // TODO: copy mutable state here, so the clone can't change the internals of the original
            return (UserPermission) super.clone();
        } catch (CloneNotSupportedException e) {
            throw new AssertionError();
        }
    }
}
