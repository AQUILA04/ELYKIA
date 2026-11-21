package com.optimize.common.securities.controllers;

import com.optimize.common.securities.models.UserPermission;
import com.optimize.common.securities.payload.response.MessageResponse;
import com.optimize.common.securities.security.services.UserPermissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/permissions")
public class PermissionController {
    private final UserPermissionService userPermissionService;

    @GetMapping
    public ResponseEntity<?> getAll(Pageable pageable) {
        return ResponseEntity.ok(new MessageResponse("Permissions get successfully!",
                userPermissionService.getAll(pageable)));
    }

    @GetMapping("/all")
    public ResponseEntity<?> getAllList() {
        return ResponseEntity.ok(new MessageResponse("Permissions get successfully!",
                userPermissionService.getAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(new MessageResponse("Permission get successfully!",
                userPermissionService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody @Valid UserPermission permission) {
        return ResponseEntity.ok(new MessageResponse("Permission created successfully!",
                userPermissionService.create(permission)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        userPermissionService.deleteSoft(id);
        return ResponseEntity.ok(new MessageResponse("Permission deleted successfully!", true));
    }
}
