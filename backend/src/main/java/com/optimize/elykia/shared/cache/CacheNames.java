package com.optimize.elykia.shared.cache;

public final class CacheNames {

    public static final String PROMOTERS = "promoters";
    public static final String ARTICLES_ENABLED_LIST = "articles-enabled-list";
    public static final String ARTICLES_ALL_LIST = "articles-all-list";
    public static final String ARTICLES_PAGE = "articles-page";
    public static final String ARTICLES_ENABLED_PAGE = "articles-enabled-page";
    /** Portefeuille crédit annuel de l'équipe (cockpit rapport commerciaux). */
    public static final String TEAM_YEARLY_SUMMARY = "team-yearly-summary";
    /** Profil entreprise et charte graphique globale (singleton). */
    public static final String COMPANY_PROFILE = "company-profile";
    /** Logo binaire de l'entreprise déployée (singleton). */
    public static final String COMPANY_LOGO = "company-logo";

    /** Noms des caches liste articles (à répéter inline dans {@code @CacheEvict} — les tableaux ne sont pas des constantes d'annotation Java). */
    public static final String[] ARTICLE_LIST_CACHES = {
            ARTICLES_ENABLED_LIST,
            ARTICLES_ALL_LIST,
            ARTICLES_PAGE,
            ARTICLES_ENABLED_PAGE
    };

    private CacheNames() {
    }
}
