package com.optimize.elykia.core.ai.help;

import com.optimize.elykia.core.ai.config.AiEmbeddingConfiguration;
import com.optimize.elykia.core.ai.config.AiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class GuideVectorSearch {

    private final AiProperties aiProperties;
    private final EmbeddingModel embeddingModel;
    private final Map<String, float[]> vectorsByChunkId = new ConcurrentHashMap<>();

    public GuideVectorSearch(
            AiProperties aiProperties,
            @Autowired(required = false)
            @Qualifier(AiEmbeddingConfiguration.ELYKIA_GUIDE_EMBEDDING_MODEL)
            EmbeddingModel embeddingModel) {
        this.aiProperties = aiProperties;
        this.embeddingModel = embeddingModel;
    }

    public boolean isAvailable() {
        return embeddingModel != null && aiProperties.getHelp().isEmbeddingSearchEnabled();
    }

    public void indexChunks(List<UserGuideRagService.GuideChunk> chunks) {
        if (!isAvailable()) {
            return;
        }
        for (UserGuideRagService.GuideChunk chunk : chunks) {
            try {
                String text = chunk.title() + "\n" + chunk.content();
                float[] vector = embeddingModel.embed(text);
                vectorsByChunkId.put(chunk.id(), vector);
            } catch (Exception e) {
                log.warn("Failed to embed guide chunk {}: {}", chunk.id(), e.getMessage());
            }
        }
        log.info("Guide vector index: {} chunks embedded", vectorsByChunkId.size());
    }

    public List<UserGuideRagService.GuideChunk> search(
            String question, List<UserGuideRagService.GuideChunk> chunks, int topK) {
        if (!isAvailable() || chunks.isEmpty()) {
            return List.of();
        }
        try {
            float[] queryVector = embeddingModel.embed(question);
            List<ScoredChunk> scored = new ArrayList<>();
            for (UserGuideRagService.GuideChunk chunk : chunks) {
                float[] chunkVector = vectorsByChunkId.get(chunk.id());
                if (chunkVector != null) {
                    scored.add(new ScoredChunk(chunk, cosineSimilarity(queryVector, chunkVector)));
                }
            }
            scored.sort(Comparator.comparingDouble(ScoredChunk::score).reversed());
            return scored.stream().limit(topK).map(ScoredChunk::chunk).toList();
        } catch (Exception e) {
            log.warn("Vector search failed, fallback to keyword: {}", e.getMessage());
            return List.of();
        }
    }

    private double cosineSimilarity(float[] a, float[] b) {
        if (a.length != b.length) {
            return 0;
        }
        double dot = 0;
        double normA = 0;
        double normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0 || normB == 0) {
            return 0;
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private record ScoredChunk(UserGuideRagService.GuideChunk chunk, double score) {}
}
