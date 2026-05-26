ALTER TABLE tasks
  ADD COLUMN type_tache VARCHAR(20) DEFAULT 'TASK' NOT NULL,
  ADD COLUMN parent_task_id BIGINT NULL,
  ADD CONSTRAINT fk_task_parent
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
    ON DELETE SET NULL;

CREATE INDEX idx_task_parent ON tasks(parent_task_id);
