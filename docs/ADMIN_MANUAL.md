# HIKEathon 2025 - Admin Manual

## Table of Contents

1. [Administrative Access](#administrative-access)
2. [System Management](#system-management)
3. [Team Management](#team-management)
4. [Monitoring & Analytics](#monitoring--analytics)
5. [Troubleshooting](#troubleshooting)
6. [Security Procedures](#security-procedures)
7. [Emergency Protocols](#emergency-protocols)

## Administrative Access

### Admin Authentication

1. **Access URL**: `/admin/login`
2. **Credentials**: Use admin-specific team codes provided during event setup
3. **2FA**: Additional security layer for admin accounts
4. **Session Management**: Admin sessions have extended timeouts

### Admin Dashboard Overview

The admin dashboard provides access to:

- **System Status**: Real-time platform health monitoring
- **Team Analytics**: Usage statistics and activity tracking
- **Content Management**: Broadcast messages and announcements
- **User Support**: Team assistance and troubleshooting tools

## System Management

### Platform Health Monitoring

#### System Status Dashboard

**Location**: `/admin/dashboard`

**Key Metrics Monitored**:
- API Response Times
- Database Connection Status
- Supabase Service Health
- IONOS Model Hub Status
- Real-time Connection Count
- Error Rates and Alerts

**Status Indicators**:
- 🟢 Green: All systems operational
- 🟡 Yellow: Minor issues, monitoring required
- 🔴 Red: Critical issues, immediate action needed

#### Performance Metrics

**Server Performance**:
```
CPU Usage: < 80%
Memory Usage: < 85%
Database Connections: Monitor active connections
API Rate Limits: Track remaining quotas
```

**User Experience Metrics**:
```
Page Load Time: < 3 seconds
Chat Response Time: < 5 seconds
Image Generation Time: < 30 seconds
Error Rate: < 1%
```

### Configuration Management

#### Environment Variables

**Production Environment**:
```bash
NUXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
IONOS_API_KEY=[ionos-api-key]
ENCRYPTION_KEY=[32-character-key]
```

**Security Settings**:
```bash
JWT_SECRET=[secure-jwt-secret]
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600 # 1 hour
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600 # 1 hour
```

#### Database Schema Management

**Core Tables**:
- `teams`: Team registration and authentication
- `telemetry`: Usage tracking and analytics
- `todos`: Global task management
- `team_todos`: Team-specific progress
- `broadcasts`: Admin announcements
- `settings`: Platform configuration

**Backup Procedures**:
```bash
# Daily automated backups
pg_dump hikeathon_db > backup_$(date +%Y%m%d).sql

# Point-in-time recovery available via Supabase
# Retention: 7 days for free tier, 30+ days for paid tiers
```

## Team Management

### Team Registration

#### Creating Team Codes

**Access**: `/admin/teams`

**Team Code Format**:
- 8 characters, alphanumeric
- Pattern: `TEAM` + 4 digits (e.g., `TEAM1234`)
- Automatically generated or manually created
- Each code is unique and case-sensitive

**Team Registration Process**:
1. Generate team codes before event
2. Distribute codes to team leaders
3. Monitor team activations in real-time
4. Handle team code issues during event

#### Team Status Management

**Team States**:
- **Registered**: Code generated but not activated
- **Active**: Team has logged in and is using platform
- **Inactive**: No activity for extended period
- **Suspended**: Access temporarily disabled
- **Completed**: Team has submitted final project

**Team Operations**:
- Reset team authentication
- Extend session timeouts
- Disable/enable team access
- Merge or split team data

### User Support

#### Common Support Tasks

**Authentication Issues**:
```
1. Verify team code is correct
2. Check if team is suspended
3. Clear team session if stuck
4. Regenerate team token if corrupted
```

**Technical Support**:
```
1. Check individual team error logs
2. Monitor team's API usage
3. Verify model availability
4. Test team's specific endpoints
```

#### Support Tools

**Team Lookup**: Search teams by code, activity, or status
**Activity Logs**: View team's recent actions and errors
**Session Management**: Force logout, extend sessions, clear cache
**Communication**: Send direct messages to specific teams

## Monitoring & Analytics

### Real-time Analytics

#### Usage Dashboard

**Key Metrics**:
- Active Teams: Currently logged in teams
- Chat Messages: Messages sent per hour/day
- Image Generations: Images created per hour/day
- API Calls: Total API requests and success rates
- Error Tracking: Failed requests and error types

**Performance Tracking**:
```sql
-- Most active teams
SELECT team_code, COUNT(*) as messages 
FROM telemetry 
WHERE event_type = 'chat_message' 
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY team_code 
ORDER BY messages DESC;

-- System load indicators
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_events,
  COUNT(CASE WHEN event_type = 'error' THEN 1 END) as errors
FROM telemetry 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

#### Analytics Reports

**Hourly Reports**:
- Team activity levels
- Model usage distribution
- Error rates and types
- Resource consumption

**Daily Summaries**:
- Total teams registered vs. active
- Platform usage trends
- Performance benchmarks
- Issue resolution status

### Telemetry Data

#### Data Collection

**Automatic Tracking**:
- Page views and navigation
- Chat interactions and response times
- Image generation requests and completion
- Authentication events
- Error occurrences and stack traces

**Privacy Compliance**:
- No personal information collected
- Team codes are hashed in analytics
- Chat content is not permanently stored
- GDPR-compliant data handling

#### Data Export

**Analytics Export**:
```bash
# Export hourly statistics
psql -c "COPY (
  SELECT * FROM telemetry 
  WHERE created_at BETWEEN '2025-09-01' AND '2025-09-03'
) TO '/tmp/hackathon_analytics.csv' WITH CSV HEADER;"

# Export team performance metrics
psql -c "COPY (
  SELECT team_code, event_type, COUNT(*) as count
  FROM telemetry 
  GROUP BY team_code, event_type
) TO '/tmp/team_metrics.csv' WITH CSV HEADER;"
```

## Troubleshooting

### Common Issues

#### Authentication Problems

**Symptoms**: Teams cannot login or sessions expire immediately

**Diagnosis**:
```bash
# Check team status
SELECT * FROM teams WHERE team_code = 'TEAM1234';

# Verify encryption key
echo $ENCRYPTION_KEY | wc -c # Should output 33 (32 chars + newline)

# Test token generation
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Solutions**:
1. Verify team code exists and is active
2. Check encryption key configuration
3. Clear Redis cache if using caching
4. Restart authentication service

#### API Performance Issues

**Symptoms**: Slow response times, timeouts, high error rates

**Diagnosis**:
```bash
# Check API response times
curl -w "Time: %{time_total}s\n" https://[app-url]/api/health

# Monitor database performance
SELECT * FROM pg_stat_activity WHERE state = 'active';

# Check Supabase metrics
# (Access via Supabase dashboard)
```

**Solutions**:
1. Scale database resources if needed
2. Implement query caching
3. Add database indexes for slow queries
4. Contact IONOS support for API issues

#### Memory and Resource Issues

**Symptoms**: Platform slowdown, service crashes, high resource usage

**Monitoring Commands**:
```bash
# Memory usage
free -h
ps aux --sort=-%mem | head -10

# CPU usage
top -o %CPU
ps aux --sort=-%cpu | head -10

# Disk space
df -h
du -sh /var/log/* | sort -hr
```

### Emergency Procedures

#### Service Outage Response

**Immediate Actions (0-5 minutes)**:
1. Acknowledge the incident
2. Check system status dashboard
3. Notify event organizers
4. Post status update for participants

**Assessment Phase (5-15 minutes)**:
1. Identify root cause
2. Determine impact scope
3. Estimate resolution time
4. Implement temporary workarounds

**Resolution Phase (15+ minutes)**:
1. Apply fixes systematically
2. Test functionality thoroughly
3. Monitor system stability
4. Document incident details

#### Data Recovery Procedures

**Database Recovery**:
```bash
# Restore from latest backup
psql hikeathon_db < backup_latest.sql

# Point-in-time recovery (Supabase)
# Use Supabase dashboard for GUI-based recovery
# Or use SQL commands for specific table recovery
```

**File System Recovery**:
```bash
# Restore application files
rsync -avz backup_directory/ /app/

# Verify file permissions
chmod +x /app/server/index.mjs
chown -R app:app /app/
```

### Performance Optimization

#### Database Optimization

**Index Creation**:
```sql
-- Optimize telemetry queries
CREATE INDEX idx_telemetry_team_date ON telemetry(team_code, created_at);
CREATE INDEX idx_telemetry_event_type ON telemetry(event_type);

-- Optimize team lookups
CREATE INDEX idx_teams_status ON teams(status);
```

**Query Optimization**:
```sql
-- Efficient team activity lookup
EXPLAIN ANALYZE SELECT 
  team_code, 
  COUNT(*) as activity_count
FROM telemetry 
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND event_type IN ('chat_message', 'image_generation')
GROUP BY team_code;
```

#### Application Performance

**Caching Strategy**:
- Static assets: 1 year cache headers
- API responses: 5-minute cache for non-user-specific data
- Database queries: Redis cache for frequently accessed data

**Code Optimization**:
- Minimize bundle sizes with code splitting
- Use CDN for static asset delivery
- Implement lazy loading for images
- Optimize database queries and indexes

## Security Procedures

### Access Control

#### Admin Account Management

**Account Creation**:
```bash
# Generate secure admin token
admin_token=$(openssl rand -hex 32)
echo "Admin token: $admin_token"

# Hash admin password
bcrypt_hash=$(node -e "console.log(require('bcryptjs').hashSync('$password', 12))")
```

**Permission Levels**:
- **Super Admin**: Full system access
- **Event Admin**: Team and content management
- **Support Admin**: Limited troubleshooting access
- **Read-Only Admin**: Analytics and monitoring only

#### Security Monitoring

**Failed Login Attempts**:
```sql
-- Monitor suspicious authentication attempts
SELECT 
  team_code,
  COUNT(*) as failed_attempts,
  MAX(created_at) as last_attempt
FROM telemetry 
WHERE event_type = 'auth_failure'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY team_code
HAVING COUNT(*) > 5;
```

**Rate Limiting**:
```
Chat API: 10 requests/minute per team
Image API: 5 requests/minute per team
Auth API: 3 requests/minute per IP
Admin API: 100 requests/minute per admin
```

### Data Protection

#### Encryption Standards

**Data at Rest**:
- Database: AES-256 encryption
- File storage: Server-side encryption
- Backups: Encrypted with GPG keys

**Data in Transit**:
- HTTPS/TLS 1.3 for all connections
- API communications encrypted end-to-end
- WebSocket connections over WSS

**Key Management**:
```bash
# Rotate encryption keys (monthly)
new_key=$(openssl rand -hex 32)
echo "New encryption key: $new_key"

# Update environment variables
# Restart services with new key
# Verify all services are operational
```

#### Privacy Compliance

**Data Minimization**:
- Collect only necessary data for platform operation
- Automatically purge temporary data after event
- Anonymize analytics data

**User Rights**:
- Teams can request data export
- Teams can request data deletion
- Transparent data usage policies

### Incident Response

#### Security Incident Protocol

**Detection Phase**:
1. Automated monitoring alerts
2. Manual security audit findings
3. User reports of suspicious activity
4. Third-party security notifications

**Response Phases**:
1. **Immediate** (0-30 minutes): Contain the threat
2. **Short-term** (30 minutes - 4 hours): Assess and remediate
3. **Recovery** (4-24 hours): Restore normal operations
4. **Post-incident** (24+ hours): Document and improve

**Communication Plan**:
- Internal: Immediate notification to admin team
- Participants: Status updates via platform announcements
- Organizers: Detailed incident reports
- Legal: Compliance notifications if required

## Backup and Recovery

### Backup Strategy

#### Automated Backups

**Database Backups**:
```bash
# Daily full backup
pg_dump -h localhost -U postgres hikeathon_db | gzip > /backups/db_$(date +%Y%m%d).sql.gz

# Hourly incremental backups during event
pg_dump -h localhost -U postgres --incremental hikeathon_db | gzip > /backups/db_incremental_$(date +%Y%m%d_%H).sql.gz
```

**File System Backups**:
```bash
# Application files
rsync -avz --delete /app/ /backups/app_$(date +%Y%m%d)/

# Configuration files
tar -czf /backups/config_$(date +%Y%m%d).tar.gz /etc/nginx/ /etc/ssl/
```

**Recovery Testing**:
- Weekly backup restoration tests
- Disaster recovery drills before major events
- Documentation of recovery procedures

### Disaster Recovery

#### Recovery Time Objectives (RTO)

- **Critical Services**: 15 minutes
- **Full Platform**: 1 hour
- **Historical Data**: 4 hours

#### Recovery Point Objectives (RPO)

- **Database**: 5 minutes (continuous replication)
- **File System**: 1 hour (scheduled backups)
- **Configuration**: 24 hours (version control)

## Event Management

### Pre-Event Checklist

**Platform Preparation** (1 week before):
- [ ] Generate all team codes
- [ ] Test all system components
- [ ] Verify API quotas and limits
- [ ] Load test with expected traffic
- [ ] Prepare monitoring dashboards
- [ ] Train support staff

**Final Preparations** (24 hours before):
- [ ] Final system backup
- [ ] Enable monitoring alerts
- [ ] Distribute team codes
- [ ] Brief admin team
- [ ] Test emergency procedures
- [ ] Verify contact information

### During Event Operations

#### Continuous Monitoring

**Real-time Dashboards**:
- System health and performance
- Team activity and engagement
- API usage and remaining quotas
- Error rates and response times

**Proactive Management**:
- Monitor for unusual patterns
- Scale resources as needed
- Address issues before they impact users
- Communicate with participants

#### Support Operations

**Support Desk Setup**:
- Dedicated admin workstations
- Access to all monitoring tools
- Direct communication channels
- Escalation procedures

**Common Support Requests**:
1. Team code issues (20%)
2. Technical problems (30%)
3. Platform navigation help (25%)
4. Feature requests (15%)
5. Other issues (10%)

### Post-Event Activities

#### Data Export and Analysis

**Event Summary Report**:
- Total participants and teams
- Platform usage statistics
- Performance metrics
- Issue resolution summary
- Lessons learned

**Data Retention**:
- Immediate: Export critical analytics
- 7 days: Maintain full data access
- 30 days: Archive essential data
- 90 days: Delete personal data
- Indefinite: Anonymized analytics

#### System Cleanup

**Post-Event Checklist**:
- [ ] Export final analytics
- [ ] Back up all event data
- [ ] Disable team access codes
- [ ] Clear temporary data
- [ ] Archive system logs
- [ ] Update documentation
- [ ] Conduct post-mortem review

---

**Admin Contact Information**:
- **Emergency**: [Phone number]
- **Technical**: [Email address]
- **General**: [Support email]

*This manual is updated before each event. Current version: September 2025*