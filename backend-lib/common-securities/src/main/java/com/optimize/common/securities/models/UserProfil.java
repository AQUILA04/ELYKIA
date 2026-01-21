package com.optimize.common.securities.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.common.entities.enums.State;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.proxy.HibernateProxy;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Entity
@Getter
@Setter
@Table(name = "UPRO")
@NoArgsConstructor
@AllArgsConstructor
public class UserProfil extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "PROID")
    private Long id;
    @Column(unique = true)
    private String name;
    @JsonIgnore
    @OneToMany(mappedBy = "userProfil")
    private Set<ProfilPermission> profilPermissions = new HashSet<>();

    public UserProfil(String name, boolean initializer) {
        this.name = name;
        if (initializer) {
            this.createdBy = "System";
            this.state = State.ENABLED;
        }
    }

    public UserProfil(Long profilId) {
        this.id = profilId;
    }

    public UserProfil(String name) {
        this.name = name;
    }


    @PrePersist
    public void setUp() {
//        if (Objects.nonNull(profilPermissions)) {
//            profilPermissions.forEach(permission -> permission.setProfil(this));
//        }
    }

    public void addPermissions(Set<UserPermission> permissions) {
        permissions.forEach(permission -> this.profilPermissions.add(new ProfilPermission(this, permission)));
    }

    public Set<UserPermission> getPermissions() {
        return this.profilPermissions.stream()
                .map(ProfilPermission::getUserPermission)
                .collect(Collectors.toSet());
    }


    @JsonProperty("isLocked")
    public boolean isLocked(){
        return Stream.of("Admin",
                "User", "Super-admin").map(profil -> profil.trim().toUpperCase())
                .anyMatch(s -> Objects.equals(s, name.trim().toUpperCase()));
    }

    @Override
    public final boolean equals(Object o) {
        if (this == o) return true;
        if (o == null) return false;
        Class<?> oEffectiveClass = o instanceof HibernateProxy ? ((HibernateProxy) o).getHibernateLazyInitializer().getPersistentClass() : o.getClass();
        Class<?> thisEffectiveClass = this instanceof HibernateProxy ? ((HibernateProxy) this).getHibernateLazyInitializer().getPersistentClass() : this.getClass();
        if (thisEffectiveClass != oEffectiveClass) return false;
        UserProfil that = (UserProfil) o;
        return getId() != null && Objects.equals(getId(), that.getId());
    }

    @Override
    public final int hashCode() {
        return this instanceof HibernateProxy ? ((HibernateProxy) this).getHibernateLazyInitializer().getPersistentClass().hashCode() : getClass().hashCode();
    }
}
