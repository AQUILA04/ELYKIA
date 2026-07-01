package com.optimize.common.securities.payload.request;

import jakarta.validation.constraints.NotBlank;

public class LoginRequest {
  @NotBlank
  private String username;

  @NotBlank
  private String password;

  private String deviceId;
  private String deviceLabel;
  private String platform;
  private String model;
  private String appVersion;

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

  public String getDeviceId() {
    return deviceId;
  }

  public void setDeviceId(String deviceId) {
    this.deviceId = deviceId;
  }

  public String getDeviceLabel() {
    return deviceLabel;
  }

  public void setDeviceLabel(String deviceLabel) {
    this.deviceLabel = deviceLabel;
  }

  public String getPlatform() {
    return platform;
  }

  public void setPlatform(String platform) {
    this.platform = platform;
  }

  public String getModel() {
    return model;
  }

  public void setModel(String model) {
    this.model = model;
  }

  public String getAppVersion() {
    return appVersion;
  }

  public void setAppVersion(String appVersion) {
    this.appVersion = appVersion;
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
