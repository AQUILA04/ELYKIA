package com.optimize.elykia.core.ai.sql;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.elykia.core.ai.config.AiProperties;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class SqlExamplesService {

    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;
    private final AiProperties aiProperties;

    @Getter
    private List<SqlDomainExamples> domains = List.of();

    @PostConstruct
    void loadExamples() {
        try {
            var resource = resourceLoader.getResource(aiProperties.getSql().getExamplesPath());
            SqlExamplesFile file = objectMapper.readValue(resource.getInputStream(), SqlExamplesFile.class);
            domains = file.domains() != null ? file.domains() : List.of();
            log.info("SQL few-shot examples loaded: {} domains", domains.size());
        } catch (Exception e) {
            log.error("Failed to load SQL examples", e);
            domains = List.of();
        }
    }

    public String formatExamplesForPrompt(String question) {
        List<SqlExample> examples = selectExamples(question);
        if (examples.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder("\nExemples SQL typiques ELYKIA (inspire-toi de leur structure, adapte à la question) :\n");
        for (SqlExample example : examples) {
            sb.append("Q: ").append(example.question()).append("\n");
            sb.append("SQL: ").append(example.sql()).append("\n\n");
        }
        return sb.toString();
    }

    public List<SqlExample> selectExamples(String question) {
        if (domains.isEmpty()) {
            return List.of();
        }
        String normalized = question.toLowerCase(Locale.FRENCH);
        List<ScoredDomain> scored = new ArrayList<>();
        for (SqlDomainExamples domain : domains) {
            int score = 0;
            if (domain.keywords() != null) {
                for (String keyword : domain.keywords()) {
                    if (normalized.contains(keyword.toLowerCase(Locale.FRENCH))) {
                        score++;
                    }
                }
            }
            if (score > 0) {
                scored.add(new ScoredDomain(domain, score));
            }
        }
        scored.sort(Comparator.comparingInt(ScoredDomain::score).reversed());

        int maxExamples = aiProperties.getSql().getMaxFewShotExamples();
        List<SqlExample> selected = new ArrayList<>();
        if (!scored.isEmpty()) {
            for (SqlExample example : scored.get(0).domain().examples()) {
                if (selected.size() >= maxExamples) {
                    break;
                }
                selected.add(example);
            }
        }
        if (selected.size() < maxExamples) {
            for (SqlDomainExamples domain : domains) {
                for (SqlExample example : domain.examples()) {
                    if (selected.size() >= maxExamples) {
                        break;
                    }
                    if (!selected.contains(example)) {
                        selected.add(example);
                    }
                }
            }
        }
        return selected;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SqlExamplesFile(List<SqlDomainExamples> domains) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SqlDomainExamples(String id, List<String> keywords, List<SqlExample> examples) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SqlExample(String question, String sql) {}

    private record ScoredDomain(SqlDomainExamples domain, int score) {}
}
