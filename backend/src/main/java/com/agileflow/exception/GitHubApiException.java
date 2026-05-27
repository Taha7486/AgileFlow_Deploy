package com.agileflow.exception;

public class GitHubApiException extends RuntimeException {
    public GitHubApiException(String message) {
        super(message);
    }
}
