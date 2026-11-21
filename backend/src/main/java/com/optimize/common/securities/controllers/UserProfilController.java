package com.optimize.common.securities.controllers;

import com.optimize.common.securities.models.UserProfil;
import com.optimize.common.securities.payload.request.AddPermissionDto;
import com.optimize.common.securities.payload.response.MessageResponse;
import com.optimize.common.securities.security.services.UserProfilService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/profils")
public class UserProfilController {
    private final UserProfilService userProfilService;

    @GetMapping
    public ResponseEntity<?> getAll(Pageable pageable) {
        return ResponseEntity.ok(new MessageResponse("Profils get successfully!",
                userProfilService.getAll(pageable)));
    }

    @GetMapping("/all")
    public ResponseEntity<?> getAllList() {
        return ResponseEntity.ok(new MessageResponse("Profils get successfully!",
                userProfilService.getAll()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(new MessageResponse("Profil get successfully!",
                userProfilService.getById(id)));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody @Valid UserProfil profil) {
        return ResponseEntity.ok(new MessageResponse("Profil created successfully!",
                userProfilService.create(profil)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody @Valid UserProfil profil) {
        profil.setId(id);
        return ResponseEntity.ok(new MessageResponse("Profil updated successfully!",
                userProfilService.update(profil)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        userProfilService.deleteSoft(id);
        return ResponseEntity.ok(new MessageResponse("Profil deleted successfully!", true));
    }

    @PatchMapping("/add-permissions")
    public ResponseEntity<?> addPermission(@RequestBody @Valid AddPermissionDto dto) {
        return ResponseEntity.ok(new MessageResponse("Permissions added successfully!",
                userProfilService.addPermission(dto.getPermissions(), dto.getProfilId())));
    }
    
    @PatchMapping("/{id}/remove-permission")
    public ResponseEntity<?> removePermission(@PathVariable Long id, @RequestParam String permission) {
        return ResponseEntity.ok(new MessageResponse("Permission removed successfully!",
                userProfilService.removePermission(id, permission)));
    }
}
