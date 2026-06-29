package com.optimize.common.securities.service;

import com.optimize.common.entities.exception.ResourceNotFoundException;
import com.optimize.common.securities.dto.DeviceInfoDto;
import com.optimize.common.securities.dto.UserAuthorizedDeviceDto;
import com.optimize.common.securities.exception.DeviceNotAuthorizedException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserAuthorizedDevice;
import com.optimize.common.securities.repository.UserAuthorizedDeviceRepository;
import com.optimize.common.securities.repository.UserRepository;
import com.optimize.common.securities.security.services.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserAuthorizedDeviceService {

    public static final String PARAMETER_KEY = "ENABLED_MOBILE_DEVICE_RESTRICTION";

    private final UserAuthorizedDeviceRepository deviceRepository;
    private final UserRepository userRepository;
    private final ParameterService parameterService;

    public boolean isEnforcementEnabledGlobally() {
        return parameterService.isEnabled(PARAMETER_KEY);
    }

    public boolean isRestrictionActiveForUser(User user) {
        return isEnforcementEnabledGlobally() && user.isMobileDeviceRestrictionEnabled();
    }

    public boolean isRestrictionActiveForUserId(Long userId) {
        return isRestrictionActiveForUser(ensureUserExists(userId));
    }

    @Transactional
    public void validateAndRegisterOnLogin(Long userId, DeviceInfoDto deviceInfo) {
        validateAndRegisterOnLogin(ensureUserExists(userId), deviceInfo);
    }

    @Transactional
    public void validateAndRegisterOnLogin(User user, DeviceInfoDto deviceInfo) {
        if (!isEnforcementEnabledGlobally()) {
            recordDeviceIfPresent(user, deviceInfo);
            return;
        }

        if (!user.isMobileDeviceRestrictionEnabled()) {
            recordDeviceIfPresent(user, deviceInfo);
            return;
        }

        if (!hasDeviceId(deviceInfo)) {
            throw new DeviceNotAuthorizedException(
                    "Cet appareil n'est pas autorisé. Mettez à jour l'application mobile et réessayez.");
        }

        String hashedDeviceId = hashDeviceId(deviceInfo.getDeviceId());
        List<UserAuthorizedDevice> activeDevices = deviceRepository.findByUserIdAndActiveTrue(user.getId());

        if (activeDevices.isEmpty()) {
            registerDevice(user, deviceInfo, hashedDeviceId, "SYSTEM");
            return;
        }

        UserAuthorizedDevice authorized = activeDevices.stream()
                .filter(device -> device.getDeviceId().equals(hashedDeviceId))
                .findFirst()
                .orElseThrow(() -> new DeviceNotAuthorizedException(
                        "Cet appareil n'est pas autorisé pour ce compte. Contactez votre administrateur."));

        updateLastSeen(authorized);
    }

    @Transactional
    public void validateDeviceForAuthenticatedUser(String username, String rawDeviceId) {
        User user = userRepository.findByUserAccount_username(username)
                .orElseThrow(() -> new ResourceNotFoundException("user.not.found"));

        if (!isRestrictionActiveForUser(user)) {
            if (StringUtils.hasText(rawDeviceId)) {
                recordDeviceIfPresent(user, DeviceInfoDto.builder().deviceId(rawDeviceId).build());
            }
            return;
        }

        if (!StringUtils.hasText(rawDeviceId)) {
            throw new DeviceNotAuthorizedException(
                    "Cet appareil n'est pas autorisé. Mettez à jour l'application mobile et réessayez.");
        }

        String hashedDeviceId = hashDeviceId(rawDeviceId);
        UserAuthorizedDevice device = deviceRepository.findByUserIdAndDeviceId(user.getId(), hashedDeviceId)
                .filter(UserAuthorizedDevice::isActive)
                .orElseThrow(() -> new DeviceNotAuthorizedException(
                        "Cet appareil n'est pas autorisé pour ce compte. Contactez votre administrateur."));

        updateLastSeen(device);
    }

    public List<UserAuthorizedDeviceDto> listDevices(Long userId) {
        ensureUserExists(userId);
        return deviceRepository.findByUserIdOrderByLastSeenAtDesc(userId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public UserAuthorizedDeviceDto revokeDevice(Long userId, Long deviceRecordId) {
        UserAuthorizedDevice device = getDeviceForUser(userId, deviceRecordId);
        device.setActive(false);
        return toDto(deviceRepository.save(device));
    }

    @Transactional
    public UserAuthorizedDeviceDto restoreDevice(Long userId, Long deviceRecordId) {
        UserAuthorizedDevice device = getDeviceForUser(userId, deviceRecordId);
        device.setActive(true);
        device.setLastSeenAt(Instant.now());
        return toDto(deviceRepository.save(device));
    }

    @Transactional
    public void deleteDevice(Long userId, Long deviceRecordId) {
        UserAuthorizedDevice device = getDeviceForUser(userId, deviceRecordId);
        deviceRepository.delete(device);
    }

    @Transactional
    public User setRestrictionEnabled(Long userId, boolean enabled) {
        User user = ensureUserExists(userId);
        user.setMobileDeviceRestrictionEnabled(enabled);
        return userRepository.save(user);
    }

    public DeviceInfoDto fromLoginRequest(String deviceId, String deviceLabel, String platform, String model,
            String appVersion) {
        if (!StringUtils.hasText(deviceId)) {
            return null;
        }
        return DeviceInfoDto.builder()
                .deviceId(deviceId)
                .deviceLabel(deviceLabel)
                .platform(platform)
                .model(model)
                .appVersion(appVersion)
                .build();
    }

    private void recordDeviceIfPresent(User user, DeviceInfoDto deviceInfo) {
        if (!hasDeviceId(deviceInfo)) {
            return;
        }
        String hashedDeviceId = hashDeviceId(deviceInfo.getDeviceId());
        Optional<UserAuthorizedDevice> existing = deviceRepository.findByUserIdAndDeviceId(user.getId(), hashedDeviceId);
        if (existing.isPresent()) {
            UserAuthorizedDevice device = existing.get();
            applyDeviceMetadata(device, deviceInfo);
            updateLastSeen(device);
            deviceRepository.save(device);
            return;
        }
        registerDevice(user, deviceInfo, hashedDeviceId, "SYSTEM");
    }

    private void registerDevice(User user, DeviceInfoDto deviceInfo, String hashedDeviceId, String registeredBy) {
        Instant now = Instant.now();
        UserAuthorizedDevice device = new UserAuthorizedDevice();
        device.setUser(user);
        device.setDeviceId(hashedDeviceId);
        applyDeviceMetadata(device, deviceInfo);
        device.setRegisteredAt(now);
        device.setLastSeenAt(now);
        device.setActive(true);
        device.setRegisteredBy(registeredBy);
        deviceRepository.save(device);
    }

    private void applyDeviceMetadata(UserAuthorizedDevice device, DeviceInfoDto deviceInfo) {
        if (deviceInfo == null) {
            return;
        }
        if (StringUtils.hasText(deviceInfo.getDeviceLabel())) {
            device.setDeviceLabel(deviceInfo.getDeviceLabel());
        }
        if (StringUtils.hasText(deviceInfo.getPlatform())) {
            device.setPlatform(deviceInfo.getPlatform());
        }
        if (StringUtils.hasText(deviceInfo.getModel())) {
            device.setModel(deviceInfo.getModel());
        }
        if (StringUtils.hasText(deviceInfo.getAppVersion())) {
            device.setAppVersion(deviceInfo.getAppVersion());
        }
    }

    private void updateLastSeen(UserAuthorizedDevice device) {
        device.setLastSeenAt(Instant.now());
        deviceRepository.save(device);
    }

    private UserAuthorizedDevice getDeviceForUser(Long userId, Long deviceRecordId) {
        return deviceRepository.findByIdAndUserId(deviceRecordId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("device.not.found"));
    }

    private User ensureUserExists(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("user.not.found"));
    }

    private boolean hasDeviceId(DeviceInfoDto deviceInfo) {
        return deviceInfo != null && StringUtils.hasText(deviceInfo.getDeviceId());
    }

    private UserAuthorizedDeviceDto toDto(UserAuthorizedDevice device) {
        return UserAuthorizedDeviceDto.builder()
                .id(device.getId())
                .deviceLabel(device.getDeviceLabel())
                .platform(device.getPlatform())
                .model(device.getModel())
                .appVersion(device.getAppVersion())
                .registeredAt(device.getRegisteredAt())
                .lastSeenAt(device.getLastSeenAt())
                .active(device.isActive())
                .registeredBy(device.getRegisteredBy())
                .build();
    }

    public String hashDeviceId(String rawDeviceId) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawDeviceId.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    public String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userDetails.getUsername();
        }
        return "SYSTEM";
    }
}
