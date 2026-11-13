-- Tool 專用 schema（與 Fuden 同一台 MySQL，不同 schema）。啟動時自動執行，可重複執行。
CREATE TABLE IF NOT EXISTS todo (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    text       VARCHAR(500) NOT NULL,
    level      VARCHAR(16)  NOT NULL DEFAULT 'normal' COMMENT 'high / normal / low / work / daily / report / stock / stock_high / mall / mall_high / other',
    sort_order INT          NOT NULL DEFAULT 0 COMMENT '越小越前面',
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_todo_sort (sort_order)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '待辦事項';

CREATE TABLE IF NOT EXISTS note (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    title      VARCHAR(200) NOT NULL DEFAULT '',
    content    MEDIUMTEXT   NOT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_note_updated (updated_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '記事本';
