package com.agileflow.websocket;

import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketSessionRegistry {

    private final ConcurrentHashMap<String, Set<String>> sessionsByEmail = new ConcurrentHashMap<>();

    public void register(String email, String sessionId) {
        if (email == null || sessionId == null) {
            return;
        }
        sessionsByEmail.computeIfAbsent(email, ignored -> ConcurrentHashMap.newKeySet()).add(sessionId);
    }

    public boolean unregisterAndHasRemaining(String email, String sessionId) {
        if (email == null || sessionId == null) {
            return false;
        }
        Set<String> sessions = sessionsByEmail.get(email);
        if (sessions == null) {
            return false;
        }
        sessions.remove(sessionId);
        if (sessions.isEmpty()) {
            sessionsByEmail.remove(email, sessions);
            return false;
        }
        return true;
    }
}
