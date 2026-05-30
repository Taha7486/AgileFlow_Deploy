USE agileflow_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS comment_mentions;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE comment_mentions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    comment_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    mention_key VARCHAR(120) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_comment_mentions_comment_user UNIQUE (comment_id, user_id),
    CONSTRAINT fk_comment_mentions_comment FOREIGN KEY (comment_id) REFERENCES comments (id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_mentions_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_comment_mentions_user ON comment_mentions (user_id);
