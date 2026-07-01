package com.optimize.common.securities.controllers;

import com.optimize.common.securities.dto.UserAuthorizedDeviceDto;
import com.optimize.common.securities.dto.UserDeviceRestrictionDto;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.payload.response.MessageResponse;
import com.optimize.common.securities.service.UserAuthorizedDeviceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users/{userId}/devices")
public class UserDeviceController {

    private final UserAuthorizedDeviceService userAuthorizedDeviceService;

    @GetMapping
    @PreAuthorize("hasRole('ROLE_EDIT_USER')")
    public ResponseEntity<MessageResponse> listDevices(@PathVariable Long userId) {
        List<UserAuthorizedDeviceDto> devices = userAuthorizedDeviceService.listDevices(userId);
        return ResponseEntity.ok(new MessageResponse("Devices retrieved successfully", devices));
    }

    @PatchMapping("/{deviceRecordId}/revoke")
    @PreAuthorize("hasRole('ROLE_EDIT_USER')")
    public ResponseEntity<MessageResponse> revokeDevice(@PathVariable Long userId,
            @PathVariable Long deviceRecordId) {
        UserAuthorizedDeviceDto device = userAuthorizedDeviceService.revokeDevice(userId, deviceRecordId);
        return ResponseEntity.ok(new MessageResponse("Device revoked successfully", device));
    }

    @PatchMapping("/{deviceRecordId}/restore")
    @PreAuthorize("hasRole('ROLE_EDIT_USER')")
    public ResponseEntity<MessageResponse> restoreDevice(@PathVariable Long userId,
            @PathVariable Long deviceRecordId) {
        UserAuthorizedDeviceDto device = userAuthorizedDeviceService.restoreDevice(userId, deviceRecordId);
        return ResponseEntity.ok(new MessageResponse("Device restored successfully", device));
    }

    @DeleteMapping("/{deviceRecordId}")
    @PreAuthorize("hasRole('ROLE_EDIT_USER')")
    public ResponseEntity<MessageResponse> deleteDevice(@PathVariable Long userId,
            @PathVariable Long deviceRecordId) {
        userAuthorizedDeviceService.deleteDevice(userId, deviceRecordId);
        return ResponseEntity.ok(new MessageResponse("Device deleted successfully", null));
    }

    @PatchMapping("/restriction")
    @PreAuthorize("hasRole('ROLE_EDIT_USER')")
    public ResponseEntity<MessageResponse> updateRestriction(@PathVariable Long userId,
            @RequestBody @Valid UserDeviceRestrictionDto restrictionDto) {
        User user = userAuthorizedDeviceService.setRestrictionEnabled(userId, restrictionDto.isEnabled());
        return ResponseEntity.ok(new MessageResponse("Device restriction updated successfully", user));
    }
}
