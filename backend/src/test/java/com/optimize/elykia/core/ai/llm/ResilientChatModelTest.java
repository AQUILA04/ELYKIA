package com.optimize.elykia.core.ai.llm;

import com.google.api.gax.rpc.InvalidArgumentException;
import com.google.api.gax.rpc.ResourceExhaustedException;
import com.google.api.gax.rpc.StatusCode;
import com.optimize.elykia.core.ai.config.AiProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ResilientChatModelTest {

    private AiProperties.Retry retry;

    @BeforeEach
    void setUp() {
        retry = new AiProperties.Retry();
        retry.setMaxAttempts(3);
        retry.setInitialBackoffMs(1);
        retry.setBackoffMultiplier(1.0);
        retry.setMaxBackoffMs(1);
    }

    @Test
    void retriesUntilTheProviderRecovers() {
        AtomicInteger calls = new AtomicInteger();
        ChatResponse expected = new ChatResponse(List.of());
        ChatModel delegate = prompt -> {
            if (calls.incrementAndGet() < 3) {
                throw resourceExhausted();
            }
            return expected;
        };

        ChatResponse actual = new ResilientChatModel(delegate, retry).call(new Prompt("ping"));

        assertSame(expected, actual);
        assertEquals(3, calls.get());
    }

    @Test
    void reportsProviderUnavailableOnceAttemptsAreExhausted() {
        AtomicInteger calls = new AtomicInteger();
        ChatModel delegate = prompt -> {
            calls.incrementAndGet();
            throw new RuntimeException("Failed to generate content", resourceExhausted());
        };

        ResilientChatModel model = new ResilientChatModel(delegate, retry);
        Prompt prompt = new Prompt("ping");

        AiProviderUnavailableException thrown =
                assertThrows(AiProviderUnavailableException.class, () -> model.call(prompt));

        assertEquals(ResilientChatModel.UNAVAILABLE_MESSAGE, thrown.getMessage());
        assertEquals(3, calls.get());
    }

    @Test
    void doesNotRetryNonThrottleFailures() {
        AtomicInteger calls = new AtomicInteger();
        ChatModel delegate = prompt -> {
            calls.incrementAndGet();
            throw new InvalidArgumentException(
                    new IllegalStateException("bad prompt"), statusCode(StatusCode.Code.INVALID_ARGUMENT), false);
        };

        ResilientChatModel model = new ResilientChatModel(delegate, retry);
        Prompt prompt = new Prompt("ping");

        assertThrows(InvalidArgumentException.class, () -> model.call(prompt));
        assertEquals(1, calls.get());
    }

    @Test
    void delegatesStreaming() {
        ChatResponse expected = new ChatResponse(List.of());
        ChatModel delegate = new ChatModel() {
            @Override
            public ChatResponse call(Prompt prompt) {
                throw new UnsupportedOperationException();
            }

            @Override
            public Flux<ChatResponse> stream(Prompt prompt) {
                return Flux.just(expected);
            }
        };

        List<ChatResponse> responses =
                new ResilientChatModel(delegate, retry).stream(new Prompt("ping")).collectList().block();

        assertEquals(List.of(expected), responses);
    }

    private static ResourceExhaustedException resourceExhausted() {
        return new ResourceExhaustedException(
                new IllegalStateException("RESOURCE_EXHAUSTED"),
                statusCode(StatusCode.Code.RESOURCE_EXHAUSTED),
                false);
    }

    private static StatusCode statusCode(StatusCode.Code code) {
        return new StatusCode() {
            @Override
            public Code getCode() {
                return code;
            }

            @Override
            public Object getTransportCode() {
                return code;
            }
        };
    }
}
