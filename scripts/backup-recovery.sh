#!/bin/bash

# HIKEathon 2025 Backup and Recovery System
# Automated backup and recovery procedures for event data

# Configuration
BACKUP_DIR="/backups/hikeathon-2025"
EXPORT_DIR="/exports/hikeathon-2025"  
ARCHIVE_DIR="/archives/hikeathon-2025"
LOG_FILE="/var/log/hikeathon-backup.log"
RETENTION_DAYS=7
NOTIFICATION_EMAIL="${BACKUP_NOTIFICATION_EMAIL}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Create directories if they don't exist
setup_directories() {
    for dir in "$BACKUP_DIR" "$EXPORT_DIR" "$ARCHIVE_DIR"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            log "INFO" "Created directory: $dir"
        fi
    done
}

# Database backup function
backup_database() {
    log "INFO" "Starting database backup..."
    
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_file="$BACKUP_DIR/db_backup_$timestamp.sql"
    local compressed_file="$backup_file.gz"
    
    if [[ -z "$SUPABASE_DB_URL" ]]; then
        log "ERROR" "SUPABASE_DB_URL not set - cannot perform database backup"
        return 1
    fi
    
    # Create backup
    if pg_dump "$SUPABASE_DB_URL" > "$backup_file"; then
        # Compress backup
        gzip "$backup_file"
        
        local file_size=$(du -h "$compressed_file" | cut -f1)
        log "INFO" "Database backup completed: $compressed_file ($file_size)"
        
        # Verify backup integrity
        if gzip -t "$compressed_file"; then
            log "INFO" "Backup integrity verified"
            return 0
        else
            log "ERROR" "Backup integrity check failed"
            return 1
        fi
    else
        log "ERROR" "Database backup failed"
        return 1
    fi
}

# Application backup function  
backup_application() {
    log "INFO" "Starting application backup..."
    
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local app_backup="$BACKUP_DIR/app_backup_$timestamp.tar.gz"
    
    # Backup application files
    if tar -czf "$app_backup" \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='.nuxt' \
        --exclude='.output' \
        --exclude='logs' \
        -C "$(dirname "$PWD")" \
        "$(basename "$PWD")"; then
        
        local file_size=$(du -h "$app_backup" | cut -f1)
        log "INFO" "Application backup completed: $app_backup ($file_size)"
        return 0
    else
        log "ERROR" "Application backup failed"
        return 1
    fi
}

# Configuration backup function
backup_configuration() {
    log "INFO" "Starting configuration backup..."
    
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local config_backup="$BACKUP_DIR/config_backup_$timestamp.tar.gz"
    
    # Create temporary directory for configs
    local temp_dir=$(mktemp -d)
    
    # Copy configuration files
    cp .env "$temp_dir/" 2>/dev/null || log "WARN" ".env file not found"
    cp nuxt.config.ts "$temp_dir/"
    cp package.json "$temp_dir/"
    cp -r .github "$temp_dir/" 2>/dev/null || log "WARN" ".github directory not found"
    
    # Backup environment variables (masked)
    env | grep -E "(NUXT_|SUPABASE_|IONOS_)" | sed 's/=.*/=***MASKED***/' > "$temp_dir/environment.txt"
    
    # Create archive
    if tar -czf "$config_backup" -C "$temp_dir" .; then
        local file_size=$(du -h "$config_backup" | cut -f1)
        log "INFO" "Configuration backup completed: $config_backup ($file_size)"
        rm -rf "$temp_dir"
        return 0
    else
        log "ERROR" "Configuration backup failed"
        rm -rf "$temp_dir"
        return 1
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "INFO" "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        rm "$file"
        deleted_count=$((deleted_count + 1))
        log "INFO" "Deleted old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -print0)
    
    log "INFO" "Cleanup completed: $deleted_count old backups removed"
}

# Full backup procedure
perform_full_backup() {
    log "INFO" "🏔️ Starting HIKEathon 2025 full backup procedure..."
    
    local success=true
    
    setup_directories
    
    # Database backup
    if ! backup_database; then
        success=false
    fi
    
    # Application backup
    if ! backup_application; then
        success=false
    fi
    
    # Configuration backup
    if ! backup_configuration; then
        success=false
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    if $success; then
        log "INFO" "✅ Full backup procedure completed successfully"
        send_notification "SUCCESS" "HIKEathon 2025 backup completed successfully"
        return 0
    else
        log "ERROR" "❌ Full backup procedure completed with errors"
        send_notification "ERROR" "HIKEathon 2025 backup completed with errors"
        return 1
    fi
}

# Database recovery function
recover_database() {
    local backup_file="$1"
    
    if [[ -z "$backup_file" ]]; then
        log "ERROR" "No backup file specified for recovery"
        return 1
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        log "ERROR" "Backup file not found: $backup_file"
        return 1
    fi
    
    log "INFO" "Starting database recovery from: $backup_file"
    
    # Create a recovery database name with timestamp
    local recovery_db="hikeathon_recovery_$(date '+%Y%m%d_%H%M%S')"
    
    # Create recovery database
    createdb "$recovery_db"
    
    # Restore backup
    if [[ "$backup_file" == *.gz ]]; then
        if gzcat "$backup_file" | psql "$recovery_db"; then
            log "INFO" "✅ Database recovery completed successfully"
            log "INFO" "Recovery database: $recovery_db"
            return 0
        else
            log "ERROR" "❌ Database recovery failed"
            dropdb "$recovery_db" 2>/dev/null
            return 1
        fi
    else
        if psql "$recovery_db" < "$backup_file"; then
            log "INFO" "✅ Database recovery completed successfully"
            log "INFO" "Recovery database: $recovery_db"
            return 0
        else
            log "ERROR" "❌ Database recovery failed"
            dropdb "$recovery_db" 2>/dev/null
            return 1
        fi
    fi
}

# List available backups
list_backups() {
    log "INFO" "Available backups in $BACKUP_DIR:"
    
    # Database backups
    echo -e "${BLUE}Database Backups:${NC}"
    ls -lh "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | \
        awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}' || \
        echo "  No database backups found"
    
    # Application backups
    echo -e "${BLUE}Application Backups:${NC}"
    ls -lh "$BACKUP_DIR"/app_backup_*.tar.gz 2>/dev/null | \
        awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}' || \
        echo "  No application backups found"
    
    # Configuration backups
    echo -e "${BLUE}Configuration Backups:${NC}"
    ls -lh "$BACKUP_DIR"/config_backup_*.tar.gz 2>/dev/null | \
        awk '{print "  " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}' || \
        echo "  No configuration backups found"
}

# Verify backup integrity
verify_backups() {
    log "INFO" "Verifying backup integrity..."
    
    local errors=0
    
    # Verify database backups
    for backup in "$BACKUP_DIR"/db_backup_*.sql.gz; do
        if [[ -f "$backup" ]]; then
            if gzip -t "$backup"; then
                log "INFO" "✅ $(basename "$backup") - OK"
            else
                log "ERROR" "❌ $(basename "$backup") - CORRUPTED"
                errors=$((errors + 1))
            fi
        fi
    done
    
    # Verify application backups
    for backup in "$BACKUP_DIR"/app_backup_*.tar.gz; do
        if [[ -f "$backup" ]]; then
            if tar -tzf "$backup" >/dev/null 2>&1; then
                log "INFO" "✅ $(basename "$backup") - OK"
            else
                log "ERROR" "❌ $(basename "$backup") - CORRUPTED"
                errors=$((errors + 1))
            fi
        fi
    done
    
    # Verify configuration backups
    for backup in "$BACKUP_DIR"/config_backup_*.tar.gz; do
        if [[ -f "$backup" ]]; then
            if tar -tzf "$backup" >/dev/null 2>&1; then
                log "INFO" "✅ $(basename "$backup") - OK"
            else
                log "ERROR" "❌ $(basename "$backup") - CORRUPTED"
                errors=$((errors + 1))
            fi
        fi
    done
    
    if [[ $errors -eq 0 ]]; then
        log "INFO" "✅ All backups verified successfully"
        return 0
    else
        log "ERROR" "❌ $errors backup(s) failed verification"
        return 1
    fi
}

# Send notification
send_notification() {
    local status="$1"
    local message="$2"
    
    if [[ -n "$NOTIFICATION_EMAIL" ]]; then
        local subject="HIKEathon 2025 Backup $status"
        echo "$message" | mail -s "$subject" "$NOTIFICATION_EMAIL"
        log "INFO" "Notification sent to $NOTIFICATION_EMAIL"
    fi
}

# Test backup system
test_backup_system() {
    log "INFO" "🧪 Testing backup system..."
    
    # Test database connection
    if psql "$SUPABASE_DB_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        log "INFO" "✅ Database connection test passed"
    else
        log "ERROR" "❌ Database connection test failed"
        return 1
    fi
    
    # Test backup directory permissions
    if touch "$BACKUP_DIR/test_file" && rm "$BACKUP_DIR/test_file"; then
        log "INFO" "✅ Backup directory write test passed"
    else
        log "ERROR" "❌ Backup directory write test failed"
        return 1
    fi
    
    # Test compression tools
    if command -v gzip >/dev/null 2>&1; then
        log "INFO" "✅ Gzip compression available"
    else
        log "ERROR" "❌ Gzip compression not available"
        return 1
    fi
    
    if command -v tar >/dev/null 2>&1; then
        log "INFO" "✅ Tar archiving available"
    else
        log "ERROR" "❌ Tar archiving not available"
        return 1
    fi
    
    log "INFO" "✅ Backup system test completed successfully"
    return 0
}

# Show usage information
show_usage() {
    echo "🏔️ HIKEathon 2025 Backup & Recovery System"
    echo "==========================================="
    echo
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo
    echo "Commands:"
    echo "  backup              Perform full backup (database + application + config)"
    echo "  backup-db           Backup database only"
    echo "  backup-app          Backup application files only"
    echo "  backup-config       Backup configuration files only"
    echo "  recover-db <file>   Recover database from backup file"
    echo "  list                List available backups"
    echo "  verify              Verify backup integrity"
    echo "  cleanup             Remove old backups"
    echo "  test                Test backup system"
    echo "  help                Show this help message"
    echo
    echo "Environment Variables:"
    echo "  SUPABASE_DB_URL              Database connection URL"
    echo "  BACKUP_NOTIFICATION_EMAIL    Email for backup notifications"
    echo
    echo "Examples:"
    echo "  $0 backup                    # Perform full backup"
    echo "  $0 recover-db backup.sql.gz  # Recover from compressed backup"
    echo "  $0 list                      # List all available backups"
    echo "  $0 verify                    # Check backup integrity"
    echo
    echo "Scheduled Usage (crontab):"
    echo "  # Backup every 6 hours during event"
    echo "  0 */6 * * * $0 backup >/dev/null 2>&1"
    echo
    echo "  # Verify backups daily"
    echo "  0 6 * * * $0 verify >/dev/null 2>&1"
}

# Main script logic
main() {
    case "${1:-help}" in
        "backup")
            perform_full_backup
            ;;
        "backup-db")
            setup_directories && backup_database
            ;;
        "backup-app")
            setup_directories && backup_application
            ;;
        "backup-config")
            setup_directories && backup_configuration
            ;;
        "recover-db")
            recover_database "$2"
            ;;
        "list")
            list_backups
            ;;
        "verify")
            verify_backups
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "test")
            test_backup_system
            ;;
        "help"|"-h"|"--help"|*)
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@"