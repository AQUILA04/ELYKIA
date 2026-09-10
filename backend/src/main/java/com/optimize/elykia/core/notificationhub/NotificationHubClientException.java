package com.optimize.elykia.core.notificationhub;

/**
 * Exception HTTP / transport lors d'un appel au Notification Hub.
 */
public class NotificationHubClientException extends RuntimeException {

    private final Integer statusCode;
    private final String responseBody;

    public NotificationHubClientException(String message, Integer statusCode) {
        this(message, statusCode, null, null);
    }

    public NotificationHubClientException(String message, Integer statusCode, String responseBody) {
        this(message, statusCode, responseBody, null);
    }

    public NotificationHubClientException(String message, Throwable cause) {
        this(message, null, null, cause);
    }

    public NotificationHubClientException(
            String message, Integer statusCode, String responseBody, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }

    public Integer getStatusCode() {
        return statusCode;
    }

    public String getResponseBody() {
        return responseBody;
    }
}
