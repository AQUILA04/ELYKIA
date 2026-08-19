package com.optimize.elykia.core.ai.help;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.elykia.core.ai.config.AiProperties;
import com.optimize.elykia.core.ai.dto.GuideSourceDto;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@ConditionalOnProperty(name = "elykia.ai.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class UserGuideRagService {

    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;
    private final AiProperties aiProperties;
    private final UserGuideAnswerFormatter answerFormatter;
    private final GuideVectorSearch guideVectorSearch;

    @Getter
    private List<GuideChunk> chunks = List.of();

    @PostConstruct
    void loadIndex() {
        try {
            Resource resource = resourceLoader.getResource(aiProperties.getHelp().getUserGuideIndexPath());
            chunks = objectMapper.readValue(resource.getInputStream(), new TypeReference<List<GuideChunk>>() {});
            guideVectorSearch.indexChunks(chunks);
            log.info("User guide index loaded: {} chunks (vector search: {})",
                    chunks.size(), guideVectorSearch.isAvailable());
        } catch (Exception e) {
            log.error("Failed to load user guide index", e);
            chunks = List.of();
        }
    }

    public UserGuideAnswer answer(String question) {
        List<GuideChunk> matches = search(question, aiProperties.getHelp().getTopKChunks());
        String context = matches.stream()
                .map(c -> c.title() + ": " + c.content())
                .reduce((a, b) -> a + "\n\n" + b)
                .orElse("Aucune documentation trouvée.");
        String reply = answerFormatter.format(question, context);
        List<GuideSourceDto> sources = matches.stream()
                .map(c -> GuideSourceDto.builder().title(c.title()).url(c.path()).build())
                .toList();
        return new UserGuideAnswer(reply, sources);
    }

    private List<GuideChunk> search(String question, int topK) {
        List<GuideChunk> vectorMatches = guideVectorSearch.search(question, chunks, topK);
        if (!vectorMatches.isEmpty()) {
            return vectorMatches;
        }
        return keywordSearch(question, topK);
    }

    private List<GuideChunk> keywordSearch(String question, int topK) {
        String[] tokens = question.toLowerCase(Locale.FRENCH).split("\\s+");
        List<ScoredChunk> scored = new ArrayList<>();
        for (GuideChunk chunk : chunks) {
            String haystack = (chunk.title() + " " + chunk.content()).toLowerCase(Locale.FRENCH);
            int score = 0;
            for (String token : tokens) {
                if (token.length() > 2 && haystack.contains(token)) {
                    score++;
                }
            }
            if (score > 0) {
                scored.add(new ScoredChunk(chunk, score));
            }
        }
        scored.sort(Comparator.comparingInt(ScoredChunk::score).reversed());
        return scored.stream().limit(topK).map(ScoredChunk::chunk).toList();
    }

    public record GuideChunk(String id, String title, String path, List<String> roles, String content) {}

    public record UserGuideAnswer(String reply, List<GuideSourceDto> sources) {}

    private record ScoredChunk(GuideChunk chunk, int score) {}
}
