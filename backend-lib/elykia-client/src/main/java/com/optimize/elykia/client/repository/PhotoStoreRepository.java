package com.optimize.elykia.client.repository;

import com.optimize.common.entities.repository.GenericRepository;
import com.optimize.elykia.client.dto.ClientPhotoDto;
import com.optimize.elykia.client.entity.PhotoStore;
import com.optimize.elykia.client.enumeration.PhotoType;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Repository
public interface PhotoStoreRepository extends GenericRepository<PhotoStore, Long> {
    Optional<PhotoStore> findByClientIdAndType(Long clientId, PhotoType type);

    boolean existsByClientId(Long clientId);

    @Query("SELECT new com.optimize.elykia.client.dto.ClientPhotoDto(p.id, p.photo) FROM PhotoStore p WHERE p.clientId IN :ids AND p.type = :type")
    List<ClientPhotoDto> getPhotos(List<Long> ids, PhotoType type);


    default PhotoStore getClientProfil(Long clientId) {
        return findByClientIdAndType(clientId, PhotoType.PROFIL).orElse(null);
    }

    default PhotoStore getClientCard(Long clientId) {
        return findByClientIdAndType(clientId, PhotoType.CARD).orElse(null);
    }

    default void saveProfilAndCard(PhotoStore profil, PhotoStore card) {
        if (Objects.nonNull(profil.getPhoto())) {
            save(profil);
        }
        if (Objects.nonNull(card.getPhoto())) {
            save(card);
        }
    }

    @Modifying
    @Query("UPDATE PhotoStore p SET p.photo = :photo WHERE p.clientId = :clientId AND p.type = :type")
    void updatePhoto(Long clientId, PhotoType type, byte[] photo);

    default void updateProfil(Long clientId, byte[] photo) {
        updatePhoto(clientId, PhotoType.PROFIL, photo);
    }

    default void updateCard(Long clientId, byte[] photo) {
        updatePhoto(clientId, PhotoType.CARD, photo);
    }
}
