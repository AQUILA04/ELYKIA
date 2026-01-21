package com.optimize.common.securities.controllers;

import com.optimize.common.securities.dto.ChangePasswordDto;
import com.optimize.common.securities.models.User;
import com.optimize.common.securities.models.UserProfil;
import com.optimize.common.securities.payload.request.AddPermissionDto;
import com.optimize.common.securities.payload.response.MessageResponse;
import com.optimize.common.securities.security.services.UserPermissionService;
import com.optimize.common.securities.security.services.UserProfilService;
import com.optimize.common.securities.security.services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {
    private final UserProfilService userProfilService;
    private final UserPermissionService userPermissionService;
    private final UserService userService;

    @GetMapping("/profil")
    public ResponseEntity<?> getAllUserProfils(Pageable pageable) {
        return ResponseEntity.ok(new MessageResponse("Profils get successfully!",
                userProfilService.getAll(pageable)));
    }

    @GetMapping
    public ResponseEntity<?> getAllUsers(Pageable pageable) {
        return ResponseEntity.ok(new MessageResponse("user get successfully!",
                userService.getAll(pageable)));
    }

    @GetMapping(value = "all")
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(new MessageResponse("user get successfully!",
                userService.getAll()));
    }

    @GetMapping(value = "{id}")
    public ResponseEntity<?> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(new MessageResponse("user get successfully!",
                userService.getById(id)));
    }

    @PutMapping(value = "{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody @Valid User user) {
        user.setId(id);
        return ResponseEntity.ok(new MessageResponse("user get successfully!",
                userService.updateUser(user)));
    }

    @PatchMapping(value = "change-password")
    public ResponseEntity<?> changePassword(@RequestBody @Valid ChangePasswordDto changePasswordDto) {
        return ResponseEntity.ok(new MessageResponse("user get successfully!",
                userService.changePassword(changePasswordDto)));
    }

    @GetMapping("/profil/all")
    public ResponseEntity<?> getAllUserProfils() {
        return ResponseEntity.ok(new MessageResponse("Profils get successfully!",
                userProfilService.getAll()));
    }

    @PatchMapping (value = "profil/add-permissions")
    public ResponseEntity<?> addProfilPermission(@RequestBody @Valid AddPermissionDto dto) {
        return ResponseEntity.ok(new MessageResponse("profil permission add successfully!",
                userProfilService.addPermission(dto.getPermissions(), dto.getProfilId())));
    }

    @PostMapping (value = "profil/add")
    public ResponseEntity<?> addProfil(@RequestBody @Valid UserProfil profil) {
        return ResponseEntity.ok(new MessageResponse("profil add successfully!",
                userProfilService.create(profil)));
    }

    @GetMapping("/permission/all")
    public ResponseEntity<?> getAllUserPermissions() {
        return ResponseEntity.ok(new MessageResponse("Permissions get successfully!",
                userPermissionService.getAll()));
    }

    @PatchMapping("/{id}/assign-profile/{profilId}")
    public ResponseEntity<?> assignProfile(@PathVariable Long id, @PathVariable Long profilId) {
        userService.assignProfile(id, profilId);
        return ResponseEntity.ok(new MessageResponse("Profile assigned successfully!", true));
    }

    @PatchMapping("/{id}/permissions/add")
    public ResponseEntity<?> addPermission(@PathVariable Long id, @RequestParam String permission) {
        userService.addPermission(id, permission);
        return ResponseEntity.ok(new MessageResponse("Permission added successfully!", true));
    }

    @PatchMapping("/{id}/permissions/remove")
    public ResponseEntity<?> removePermission(@PathVariable Long id, @RequestParam String permission) {
        userService.removePermission(id, permission);
        return ResponseEntity.ok(new MessageResponse("Permission removed successfully!", true));
    }

}
