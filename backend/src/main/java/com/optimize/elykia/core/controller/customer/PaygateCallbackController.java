package com.optimize.elykia.core.controller.customer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.optimize.elykia.core.paygate.OptimizePaygateClient;
import com.optimize.elykia.core.service.customer.CustomerAutomaticPaymentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

@RestController
@RequestMapping("/api/v1/paygate/callbacks")
public class PaygateCallbackController {

    private final OptimizePaygateClient paygateClient;
    private final CustomerAutomaticPaymentService automaticPaymentService;
    private final ObjectMapper objectMapper;

    public PaygateCallbackController(
            OptimizePaygateClient paygateClient,
            CustomerAutomaticPaymentService automaticPaymentService,
            ObjectMapper objectMapper) {
        this.paygateClient = paygateClient;
        this.automaticPaymentService = automaticPaymentService;
        this.objectMapper = objectMapper;
    }

    @PostMapping
    public ResponseEntity<Void> callback(HttpServletRequest request) throws Exception {
        String raw = StreamUtils.copyToString(request.getInputStream(), StandardCharsets.UTF_8);
        String signature = request.getHeader("X-Paygate-Signature");
        if (!matches(paygateClient.callbackSecret(), raw, signature)) {
            return ResponseEntity.status(401).build();
        }
        JsonNode node = objectMapper.readTree(raw);
        automaticPaymentService.applyCallback(
                text(node, "merchantReference"),
                text(node, "paymentId"),
                text(node, "status"),
                text(node, "operatorReference"));
        return ResponseEntity.ok().build();
    }

    private static boolean matches(String secret, String payload, String signature) {
        if (secret == null || secret.isBlank() || signature == null || signature.isBlank()) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String expected = HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
            return MessageDigest.isEqual(
                    expected.getBytes(StandardCharsets.UTF_8),
                    signature.trim().getBytes(StandardCharsets.UTF_8));
        } catch (Exception ex) {
            return false;
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return null;
        }
        String text = value.asText();
        return text == null || text.isBlank() ? null : text;
    }
}
