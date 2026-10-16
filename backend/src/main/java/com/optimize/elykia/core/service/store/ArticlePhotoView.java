package com.optimize.elykia.core.service.store;

/**
 * URLs signées prêtes à afficher. photoUrl est vide si l'article n'a pas sa propre photo.
 * displayPhotoUrl est la photo de l'article, sinon celle de son type.
 */
public record ArticlePhotoView(String photoUrl, String displayPhotoUrl) {
}
