package com.optimize.common.securities.models;

import java.util.*;
import java.util.stream.Collectors;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.optimize.common.entities.entity.BaseEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table( name = "USERS",
        uniqueConstraints = {
          @UniqueConstraint(columnNames = "ACCID"),
          @UniqueConstraint(columnNames = "USEEML")
        })
@Getter
@Setter
public class User extends BaseEntity<String> {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "USEID")
  private Long id;

  @NotBlank
  @Size(max = 20)
  @Column(name = "USEFSTNAM")
  private String firstname;

  @NotBlank
  @Size(max = 20)
  @Column(name = "USELSTNAM")
  private String lastname;

  @NotBlank
  @Size(max = 10)
  @Column(name = "USEGEND")
  private String gender;

  @NotBlank
  @Size(min = 6, max = 15)
  @Column(name = "USEPHON")
  private String phone;

  @NotBlank
  @Size(max = 50)
  @Email
  @Column(name = "USEEML")
  private String email;

  @JsonIgnore
  @OneToOne(cascade = CascadeType.MERGE)
  @JoinColumn(name = "ACCID")
  private UserAccount userAccount;

  public User() {
  }

  public User(String firstname, String lastname, String gender, String email, String phone, String username, String password) {
    this.email = email;
    this.firstname = firstname;
    this.lastname = lastname;
    this.gender = gender;
    this.phone = phone;
    this.userAccount  = new UserAccount();
    this.userAccount.setUsername(username);
    this.userAccount.setPassword(password);
  }

    public User(String firstname, String lastname, String gender, String email, String phone, UserAccount userAccount) {
        this.email = email;
        this.firstname = firstname;
        this.lastname = lastname;
        this.gender = gender;
        this.phone = phone;
        this.userAccount  = userAccount;
    }

  public String getUsername() {
    if (Objects.nonNull(userAccount)) {
      return userAccount.getUsername();
    }
    return null;
  }

  public String getPassword() {
    if (Objects.nonNull(userAccount)) {
      return userAccount.getPassword();
    }
    return null;
  }

  @JsonProperty("userPermissions")
  public Set<UserPermission> getPermissions() {
    if (Objects.nonNull(userAccount)) {
      return userAccount.getPermissions().stream()
              .map(AccountPermission::getUserPermission)
              .collect(Collectors.toSet());
    }
    return new HashSet<>();
  }

  public void addProfile(UserProfil profil) {
    if (Objects.nonNull(userAccount)) {
      this.userAccount.setUserProfil(profil);

    } else {
      throw new IllegalStateException("userAccount.not.set");
    }
  }

  @JsonProperty(value = "profil")
  public Map<String, Object> getProfil() {
      Map<String, Object> profil = new HashMap<>();
      if (Objects.nonNull(userAccount)) {
          profil.put("id", userAccount.getUserProfil().getId());
          profil.put("name", userAccount.getUserProfil().getName());
          return profil;
      }
      return profil;
  }

  public String getProfilName() {
      if (Objects.nonNull(userAccount) && Objects.nonNull(userAccount.getUserProfil())) {
          return userAccount.getUserProfil().getName();
      }
      return null;
  }

  @JsonIgnore
  public boolean is(String profileName) {
      if (Objects.nonNull(userAccount)) {
          return profileName.equals(userAccount.getProfileName());
      }
      return Boolean.FALSE;
  }

}
