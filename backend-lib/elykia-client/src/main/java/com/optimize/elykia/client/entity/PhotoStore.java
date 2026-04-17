package com.optimize.elykia.client.entity;

import com.optimize.common.entities.entity.BaseEntity;
import com.optimize.elykia.client.enumeration.PhotoType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@Entity
@ToString
public class PhotoStore extends BaseEntity<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Enumerated(EnumType.STRING)
    private PhotoType type;
    @ToString.Exclude
    private byte[] photo;
    private Long clientId;


    public static PhotoStore buildClientProfil(Client client) {
        return of(client.getId(), client.getProfilPhoto(), PhotoType.PROFIL);
    }

    public static PhotoStore buildClientCard(Client client) {
        return of(client.getId(), client.getIDDoc(), PhotoType.CARD);
    }

    private static PhotoStore of (Long clientId, byte[] photo, PhotoType type) {
        PhotoStore photoStore = new PhotoStore();
        photoStore.setClientId(clientId);
        photoStore.setPhoto(photo);
        return photoStore;
    }
}
