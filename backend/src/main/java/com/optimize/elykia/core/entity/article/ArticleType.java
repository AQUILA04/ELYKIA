package com.optimize.elykia.core.entity.article;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.optimize.common.entities.entity.Auditable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Transient;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.proxy.HibernateProxy;

import java.util.Objects;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
public class ArticleType extends Auditable<String> {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @jakarta.persistence.Column(nullable = false, unique = true)
    private String name;

    @jakarta.persistence.Column(nullable = false, unique = true)
    private String code;
    
    private String description;

    /** Clé MinIO du JPEG réduit. Jamais exposée dans l'API. */
    @Column(name = "photo_object_key", length = 255)
    private String photoObjectKey;

    /** URL signée de la photo du type. */
    @Transient
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String photoUrl;

    /** Même valeur que photoUrl : le type n'hérite pas d'une autre photo. */
    @Transient
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String displayPhotoUrl;

    @Override
    public final boolean equals(Object o) {
        if (this == o) return true;
        if (o == null) return false;
        Class<?> oEffectiveClass = o instanceof HibernateProxy ? ((HibernateProxy) o).getHibernateLazyInitializer().getPersistentClass() : o.getClass();
        Class<?> thisEffectiveClass = this instanceof HibernateProxy ? ((HibernateProxy) this).getHibernateLazyInitializer().getPersistentClass() : this.getClass();
        if (thisEffectiveClass != oEffectiveClass) return false;
        ArticleType that = (ArticleType) o;
        return getId() != null && Objects.equals(getId(), that.getId());
    }

    @JsonIgnore
    public String getPhotoObjectKey() {
        return photoObjectKey;
    }

    @Override
    public final int hashCode() {
        return this instanceof HibernateProxy ? ((HibernateProxy) this).getHibernateLazyInitializer().getPersistentClass().hashCode() : getClass().hashCode();
    }
}
