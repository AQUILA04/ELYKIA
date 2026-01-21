package com.optimize.common.securities.util;

import java.util.HashMap;
import java.util.Map;

public class DefaultResponse {
    private static Map<String, Object> responses;
    private DefaultResponse() {
    }

    public static Map<String, Object> successReturn() {
        responses = new HashMap<>();
        responses.put("success", true);
        return responses;
    }
}
