package com.optimize.elykia.core.ai.config;

import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConditionalOnProperty(name = "elykia.ai.enabled", havingValue = "true")
public class AiEmbeddingConfiguration {

    public static final String ELYKIA_GUIDE_EMBEDDING_MODEL = "elykiaGuideEmbeddingModel";

    /**
     * Bean unique pour le RAG guide — évite l'ambiguïté quand plusieurs starters
     * Spring AI (Ollama, OpenAI, …) enregistrent chacun un {@link EmbeddingModel}.
     */
    @Bean(name = ELYKIA_GUIDE_EMBEDDING_MODEL)
    @ConditionalOnProperty(name = "elykia.ai.help.embedding-search-enabled", havingValue = "true")
    @ConditionalOnBean(name = "ollamaEmbeddingModel")
    public EmbeddingModel elykiaGuideEmbeddingModel(
            @Qualifier("ollamaEmbeddingModel") ObjectProvider<EmbeddingModel> ollamaEmbeddingModel) {
        EmbeddingModel model = ollamaEmbeddingModel.getIfAvailable();
        if (model == null) {
            throw new IllegalStateException(
                    "elykia.ai.help.embedding-search-enabled=true requires Ollama embeddings. "
                            + "Set spring.ai.model.embedding=ollama and configure spring.ai.ollama.");
        }
        return model;
    }
}
