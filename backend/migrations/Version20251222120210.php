<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20251222120210 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE uploads (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, upload_id VARCHAR(36) NOT NULL, user_id VARCHAR(255) DEFAULT NULL, original_filename VARCHAR(255) NOT NULL, mime_type VARCHAR(100) NOT NULL, file_size BIGINT NOT NULL, md5_hash VARCHAR(32) NOT NULL, total_chunks INTEGER NOT NULL, uploaded_chunks INTEGER NOT NULL, status VARCHAR(20) NOT NULL, storage_path VARCHAR(500) DEFAULT NULL, error_message CLOB DEFAULT NULL, created_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
        , completed_at DATETIME DEFAULT NULL --(DC2Type:datetime_immutable)
        , last_chunk_at DATETIME NOT NULL --(DC2Type:datetime_immutable)
        )');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_96117F18CCCFBA31 ON uploads (upload_id)');
        $this->addSql('CREATE INDEX idx_upload_id ON uploads (upload_id)');
        $this->addSql('CREATE INDEX idx_status ON uploads (status)');
        $this->addSql('CREATE INDEX idx_created_at ON uploads (created_at)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE uploads');
    }
}
