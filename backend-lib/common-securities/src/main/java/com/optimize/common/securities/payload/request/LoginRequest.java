package com.optimize.common.securities.payload.request;

import jakarta.validation.constraints.NotBlank;

public class LoginRequest {
  @NotBlank
  private String username;

  @NotBlank
  private String password;

  public String getUsername() {
    return username;
  }

  public void setUsername(String username) {
    this.username = username;
  }

  public String getPassword() {
    return password;
  }

  public void setPassword(String password) {
    this.password = password;
  }

  @Override
  public String toString() {
    return "LoginRequest [username=" + username + ", password=" + maskPassword(password) + "]";
  }

  private String maskPassword(String password) {
    if (password == null) {
      return "null";
    }
    int length = password.length();
    if (length < 5) {
      return "***";
    }
    return password.substring(0, 2) + "***" + password.substring(length - 3);
  }
}
