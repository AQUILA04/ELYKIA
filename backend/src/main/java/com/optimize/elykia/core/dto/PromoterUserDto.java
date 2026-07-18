package com.optimize.elykia.core.dto;

import com.optimize.common.securities.models.User;

import java.util.List;

/**
 * DTO léger pour un commercial (profil PROMOTER) — sans relations JPA ni permissions.
 * Champs alignés sur les besoins frontend (sélecteurs / liste) et mobile (sync commerciale).
 */
public record PromoterUserDto(
        Long id,
        String username,
        String firstname,
        String lastname,
        String gender,
        String phone,
        String email) {

    public static PromoterUserDto fromEntity(User user) {
        if (user == null) {
            return null;
        }
        return new PromoterUserDto(
                user.getId(),
                user.getUsername(),
                user.getFirstname(),
                user.getLastname(),
                user.getGender(),
                user.getPhone(),
                user.getEmail());
    }

    public static List<PromoterUserDto> fromList(List<User> users) {
        if (users == null) {
            return List.of();
        }
        return users.stream().map(PromoterUserDto::fromEntity).toList();
    }
}
