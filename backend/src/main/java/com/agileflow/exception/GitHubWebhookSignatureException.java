package com.agileflow.exception;

public class GitHubWebhookSignatureException extends RuntimeException {
    public GitHubWebhookSignatureException(String message) {
        super(message);
    }
}
