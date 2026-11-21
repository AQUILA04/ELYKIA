package com.optimize.common.securities.service;

import com.optimize.common.securities.dto.DeviceInfoDto;
import com.optimize.common.securities.exception.DeviceNotAuthorizedException;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserAuthorizedDevice;
import com.optimize.common.securities.repository.UserAuthorizedDeviceRepository;
import com.optimize.common.securities.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserAuthorizedDeviceServiceTest {

    @Mock
    private UserAuthorizedDeviceRepository deviceRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ParameterService parameterService;

    @InjectMocks
    private UserAuthorizedDeviceService service;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setMobileDeviceRestrictionEnabled(false);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
    }

    @Test
    void validateAndRegisterOnLogin_recordsDeviceForVisibilityWhenGlobalFlagDisabled() {
        when(parameterService.isEnabled(UserAuthorizedDeviceService.PARAMETER_KEY)).thenReturn(false);
        when(deviceRepository.findByUserIdAndDeviceId(eq(1L), anyString())).thenReturn(Optional.empty());
        when(deviceRepository.save(any(UserAuthorizedDevice.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.validateAndRegisterOnLogin(1L, sampleDeviceInfo());

        verify(deviceRepository).save(any(UserAuthorizedDevice.class));
    }

    @Test
    void validateAndRegisterOnLogin_autoEnrollsWhenRestrictionEnabledAndNoDevices() {
        when(parameterService.isEnabled(UserAuthorizedDeviceService.PARAMETER_KEY)).thenReturn(true);
        user.setMobileDeviceRestrictionEnabled(true);
        when(deviceRepository.findByUserIdAndActiveTrue(1L)).thenReturn(List.of());
        when(deviceRepository.save(any(UserAuthorizedDevice.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertDoesNotThrow(() -> service.validateAndRegisterOnLogin(1L, sampleDeviceInfo()));

        ArgumentCaptor<UserAuthorizedDevice> captor = ArgumentCaptor.forClass(UserAuthorizedDevice.class);
        verify(deviceRepository).save(captor.capture());
        assertTrue(captor.getValue().isActive());
        assertEquals("SYSTEM", captor.getValue().getRegisteredBy());
    }

    @Test
    void validateAndRegisterOnLogin_rejectsUnknownDevice() {
        when(parameterService.isEnabled(UserAuthorizedDeviceService.PARAMETER_KEY)).thenReturn(true);
        user.setMobileDeviceRestrictionEnabled(true);
        UserAuthorizedDevice existing = new UserAuthorizedDevice();
        existing.setDeviceId(service.hashDeviceId("known-device"));
        existing.setActive(true);
        when(deviceRepository.findByUserIdAndActiveTrue(1L)).thenReturn(List.of(existing));

        DeviceInfoDto unknown = DeviceInfoDto.builder().deviceId("unknown-device").build();

        assertThrows(DeviceNotAuthorizedException.class,
                () -> service.validateAndRegisterOnLogin(1L, unknown));
    }

    @Test
    void validateAndRegisterOnLogin_rejectsMissingDeviceIdWhenRestrictionEnabled() {
        when(parameterService.isEnabled(UserAuthorizedDeviceService.PARAMETER_KEY)).thenReturn(true);
        user.setMobileDeviceRestrictionEnabled(true);

        assertThrows(DeviceNotAuthorizedException.class,
                () -> service.validateAndRegisterOnLogin(1L, null));
    }

    private DeviceInfoDto sampleDeviceInfo() {
        return DeviceInfoDto.builder()
                .deviceId("device-123")
                .deviceLabel("Test Phone")
                .platform("android")
                .model("Pixel")
                .appVersion("2.10.0")
                .build();
    }
}
