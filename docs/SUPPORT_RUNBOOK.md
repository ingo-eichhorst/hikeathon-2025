# HIKEathon 2025 - Support Runbook

## Emergency Contacts

### Primary Support Team
- **Event Director**: [Contact Info]
- **Technical Lead**: [Contact Info]  
- **Platform Admin**: [Contact Info]
- **Backup Support**: [Contact Info]

### Escalation Chain
1. **Level 1**: Platform Support (Response: <15 min)
2. **Level 2**: Technical Lead (Response: <30 min)
3. **Level 3**: Event Director (Response: <1 hour)

## Quick Response Procedures

### 🚨 CRITICAL ISSUES (Immediate Response)

#### Platform Completely Down
**Symptoms**: Health check fails, no users can access platform
**Response Time**: Immediate (0-5 minutes)

```bash
# 1. Quick assessment
curl https://[production-url]/api/health
curl https://[production-url]/

# 2. Check GitHub Pages status
gh api repos/owner/hikeathon-2025/pages

# 3. Check recent deployments
gh run list --workflow=deploy.yml --limit 5

# 4. If deployment issue, rollback immediately
gh workflow run deploy.yml --ref [last-known-good-commit]

# 5. Notify all stakeholders
echo "CRITICAL: Platform down. Investigating." >> alerts.log
```

**Communications Template:**
```
🔥 URGENT: HIKEathon 2025 platform is currently experiencing issues. 
Our team is investigating and will provide updates every 15 minutes.
ETA for resolution: [XX minutes]
```

#### Database Connection Lost
**Symptoms**: Health check shows database disconnected
**Response Time**: Immediate (0-5 minutes)

```bash
# 1. Check Supabase status
curl https://status.supabase.com/api/v2/status.json

# 2. Test direct connection
psql "postgresql://[user]:[pass]@[host]:5432/postgres" -c "SELECT 1;"

# 3. Check recent database migrations
supabase db remote-commits

# 4. If needed, restart connections
# Contact Supabase support immediately
```

#### Mass Authentication Failures
**Symptoms**: Multiple teams reporting login issues
**Response Time**: Immediate (0-5 minutes)

```bash
# 1. Validate team codes
node scripts/validate-teams.js

# 2. Check authentication service
curl -X POST https://[production-url]/api/auth/validate \
  -d '{"code": "TESTTEAM"}' -H "Content-Type: application/json"

# 3. Verify encryption key
echo $ENCRYPTION_KEY | wc -c  # Should be 65 characters

# 4. Check recent team code generations
psql -c "SELECT COUNT(*) FROM teams WHERE created_at > NOW() - INTERVAL '24 hours';"
```

### ⚠️ HIGH PRIORITY ISSUES (15-minute response)

#### Slow Performance
**Symptoms**: Response times >5 seconds, user complaints
**Response Time**: 15 minutes

```bash
# 1. Check system resources
node scripts/event-monitor.js --check-once

# 2. Monitor current load
curl -w "Time: %{time_total}s\n" https://[production-url]/api/health

# 3. Check for traffic spikes
tail -f logs/access.log | grep -c "GET"

# 4. Scale if needed (GitHub Pages auto-scales)
# Monitor CDN cache hit rates
```

#### API Rate Limiting
**Symptoms**: Teams reporting API failures
**Response Time**: 15 minutes

```bash
# 1. Check IONOS API status
curl https://ai-proxy.ionos.com/health

# 2. Monitor our API usage
grep "429" logs/api.log | wc -l

# 3. Check team-specific limits
# Review telemetry for high-usage teams

# 4. Implement temporary throttling if needed
```

#### Single Team Issues
**Symptoms**: One team cannot access features
**Response Time**: 15 minutes

```bash
# 1. Validate specific team code
node -e "
const code = 'TEAM1234';
console.log('Validating:', code);
// Add validation logic
"

# 2. Check team's recent activity
psql -c "SELECT * FROM telemetry WHERE team_code = 'TEAM1234' ORDER BY created_at DESC LIMIT 10;"

# 3. Clear team session if needed
psql -c "UPDATE teams SET session_data = NULL WHERE team_code = 'TEAM1234';"

# 4. Test team access manually
```

### 📝 STANDARD ISSUES (30-minute response)

#### Feature Not Working
**Symptoms**: Chat, images, or admin features failing
**Response Time**: 30 minutes

**Chat Issues:**
```bash
# 1. Test chat endpoint
curl -X POST https://[production-url]/api/chat \
  -d '{"message": "test", "teamCode": "TESTTEAM"}' \
  -H "Content-Type: application/json"

# 2. Check IONOS API connectivity
# Verify API keys are valid

# 3. Test different models
# Check model availability

# 4. Review recent chat telemetry
```

**Image Generation Issues:**
```bash
# 1. Test image endpoint
curl -X POST https://[production-url]/api/images \
  -d '{"prompt": "test image", "teamCode": "TESTTEAM"}' \
  -H "Content-Type: application/json"

# 2. Check image generation service
# Verify quota limits

# 3. Test with different prompts
# Check for content filtering
```

**Admin Panel Issues:**
```bash
# 1. Test admin authentication
curl https://[production-url]/admin/api/health

# 2. Check admin permissions
# Verify admin team codes

# 3. Test admin functions
# Check database connectivity
```

## Event Phase Procedures

### Phase 1: Hours 0-12 (Event Start)

#### Pre-Event Checklist (T-30 minutes)
```bash
# Run full system health check
node scripts/health-check.js

# Validate all team codes  
node scripts/validate-teams.js

# Start continuous monitoring
nohup node scripts/event-monitor.js > monitor.log 2>&1 &

# Verify backup systems
pg_dump --version
aws s3 ls s3://backup-bucket/ || echo "S3 backup not configured"

# Test alert systems
echo "Test alert" | mail -s "HIKEathon Alert Test" support@domain.com
```

#### Hour 0: Event Launch
```bash
# 1. Send welcome broadcast
curl -X POST https://[production-url]/admin/api/broadcast \
  -d '{"title": "Welcome to HIKEathon 2025!", "message": "Event has started!"}' \
  -H "Content-Type: application/json"

# 2. Monitor initial team logins
watch -n 30 "psql -c \"SELECT COUNT(DISTINCT team_code) FROM telemetry WHERE created_at > NOW() - INTERVAL '1 hour';\""

# 3. Check for authentication spikes
grep "login" logs/api.log | tail -20

# 4. Prepare for support requests
mkdir -p support-tickets/$(date +%Y%m%d)
```

#### Hours 1-12: Active Monitoring
```bash
# Every hour:
# 1. Check system health
node scripts/health-check.js --quick

# 2. Review error logs
tail -100 logs/error.log | grep -i "error\|critical\|fail"

# 3. Check team activity
psql -c "SELECT team_code, COUNT(*) as activity FROM telemetry WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY team_code ORDER BY activity DESC LIMIT 10;"

# 4. Monitor resource usage
df -h / && free -m
```

### Phase 2: Hours 12-36 (Sustained Operation)

#### Routine Monitoring (Every 30 minutes)
```bash
# 1. Performance check
curl -w "Response time: %{time_total}s\n" https://[production-url]/api/health

# 2. Database health
psql -c "SELECT NOW(), COUNT(*) FROM telemetry;"

# 3. Active teams count
psql -c "SELECT COUNT(DISTINCT team_code) FROM telemetry WHERE created_at > NOW() - INTERVAL '30 minutes';"

# 4. Error rate check
grep -c "ERROR" logs/api.log
```

#### Scheduled Broadcasts
```bash
# Hour 12: Mid-event check-in
curl -X POST https://[production-url]/admin/api/broadcast \
  -d '{"title": "12 Hours In!", "message": "Great progress everyone! Remember to save your work regularly."}' \
  -H "Content-Type: application/json"

# Hour 24: Halfway point
curl -X POST https://[production-url]/admin/api/broadcast \
  -d '{"title": "Halfway There!", "message": "24 hours complete! Keep up the amazing work!"}' \
  -H "Content-Type: application/json"
```

### Phase 3: Hours 36-48 (Final Sprint)

#### Increased Monitoring (Every 15 minutes)
```bash
# 1. High-frequency health checks
while true; do
  date
  node scripts/health-check.js --quick
  sleep 900  # 15 minutes
done

# 2. Submission system prep
curl https://[production-url]/admin/api/submissions/status

# 3. Monitor final rush traffic
watch -n 60 "ps aux | grep node | wc -l"
```

#### Critical Deadline Reminders
```bash
# T-12 hours
curl -X POST https://[production-url]/admin/api/broadcast \
  -d '{"title": "12 Hours Remaining", "message": "Final sprint begins! Make sure to submit your projects."}' \
  -H "Content-Type: application/json"

# T-6 hours  
curl -X POST https://[production-url]/admin/api/broadcast \
  -d '{"title": "6 Hours Left!", "message": "Time to finalize submissions. Platform support available 24/7."}' \
  -H "Content-Type: application/json"

# T-1 hour
curl -X POST https://[production-url]/admin/api/broadcast \
  -d '{"title": "FINAL HOUR!", "message": "Last chance to submit! Submissions close at [TIME]."}' \
  -H "Content-Type: application/json"
```

## Data Management

### Real-time Backups
```bash
# Continuous backup script
#!/bin/bash
while true; do
  timestamp=$(date +%Y%m%d_%H%M%S)
  
  # Database backup
  pg_dump "postgresql://[connection-string]" > "backups/db_${timestamp}.sql"
  
  # Compress and upload
  gzip "backups/db_${timestamp}.sql"
  
  # Keep last 48 hours of backups
  find backups/ -name "*.sql.gz" -mtime +2 -delete
  
  sleep 3600  # Every hour
done
```

### Data Export (Post-Event)
```bash
# Export all team data
psql -c "COPY (
  SELECT 
    team_code,
    name,
    created_at,
    status
  FROM teams
) TO 'exports/teams.csv' WITH CSV HEADER;"

# Export telemetry data
psql -c "COPY (
  SELECT 
    team_code,
    event_type,
    created_at,
    event_data
  FROM telemetry
  WHERE created_at >= '[EVENT_START_DATE]'
    AND created_at <= '[EVENT_END_DATE]'
) TO 'exports/telemetry.csv' WITH CSV HEADER;"

# Export chat history (anonymized)
psql -c "COPY (
  SELECT 
    LEFT(team_code, 4) || '***' as team_id,
    LENGTH(event_data->>'message') as message_length,
    event_data->>'model' as model_used,
    created_at
  FROM telemetry
  WHERE event_type = 'chat_message'
) TO 'exports/chat_summary.csv' WITH CSV HEADER;"
```

## Troubleshooting Guide

### Common Issues

#### "Team Code Not Working"
1. **Check code format**: Must be exactly 8 characters
2. **Verify in database**: `SELECT * FROM teams WHERE team_code = 'XXXXXXXX';`
3. **Check status**: Team status should be 'active'
4. **Clear browser cache**: Advise user to refresh/clear cache
5. **Test alternative code**: Provide backup team code if needed

#### "Chat Not Responding" 
1. **Check IONOS API**: Verify external API connectivity
2. **Test with different model**: Switch to backup model
3. **Check rate limits**: Review team's recent usage
4. **Verify message format**: Ensure proper JSON formatting
5. **Clear team session**: Reset team's connection state

#### "Images Not Generating"
1. **Check prompt content**: Ensure appropriate content
2. **Verify image service**: Test image generation endpoint  
3. **Check quotas**: Review team's image generation limits
4. **Test simpler prompt**: Try basic prompt to isolate issue
5. **Check storage**: Verify image storage availability

#### "Admin Panel Access Issues"
1. **Verify admin code**: Check admin team code is valid
2. **Check permissions**: Ensure proper admin role assignment
3. **Test direct URL**: Try accessing admin endpoints directly
4. **Clear admin session**: Reset admin authentication
5. **Check admin database**: Verify admin table integrity

### Performance Optimization

#### High Response Times
```bash
# 1. Identify bottlenecks
tail -f logs/api.log | grep -E "[0-9]+ms" | sort -rn

# 2. Check database performance
psql -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# 3. Monitor concurrent users
ps aux | grep -c node

# 4. Check CDN cache rates
curl -I https://[production-url]/ | grep -i cache
```

#### High Error Rates
```bash
# 1. Categorize errors
grep ERROR logs/api.log | cut -d: -f2 | sort | uniq -c | sort -rn

# 2. Check recent deployments  
gh run list --workflow=deploy.yml --limit 5

# 3. Verify configuration
env | grep -E "SUPABASE|IONOS" | wc -l

# 4. Test core functionality
node scripts/health-check.js --verbose
```

## Communication Templates

### Status Updates

#### All Clear
```
✅ HIKEathon 2025 Platform Status: ALL SYSTEMS OPERATIONAL
- Response times: Normal (<2s)
- Active teams: [X]
- Error rate: <1%
Next update: [Time]
```

#### Minor Issues
```
⚠️ HIKEathon 2025 Platform Status: MINOR ISSUES DETECTED
- Issue: [Description]
- Impact: [Scope] 
- ETA Resolution: [Time]
- Workaround: [If available]
Next update: [Time]
```

#### Major Issues  
```
🚨 HIKEathon 2025 Platform Status: SERVICE DISRUPTION
- Issue: [Description]
- Impact: [Scope]
- Team working on: [Resolution steps]
- ETA Resolution: [Time]
Emergency contact: [Phone/Email]
Updates every 15 minutes
```

### Team Communications

#### Welcome Message
```
🏔️ Welcome to HIKEathon 2025!

Your adventure begins now! Here's what you need to know:

✅ Platform is fully operational
🤖 AI assistants ready to help
🎨 Image generation available
💬 Support available 24/7

Need help? Type /help or contact support.
Let's build something amazing! 🚀
```

#### Technical Difficulties
```
⚠️ Technical Notice

We're experiencing [brief description of issue].

What we're doing:
- [Action 1]
- [Action 2]
- ETA: [Time]

What you can do:
- [Workaround if available]
- Continue working offline
- Save your progress locally

Updates: [Communication channel]
```

#### System Maintenance
```
🔧 Scheduled Maintenance

Brief maintenance window: [Time range]
Expected downtime: [Duration]
Services affected: [List]

Please save your work before [Time].
All data will be preserved.

Questions? Contact support: [Contact]
```

## Post-Event Procedures

### Data Preservation
```bash
# 1. Final database backup
pg_dump "postgresql://[connection]" > final_backup_$(date +%Y%m%d).sql

# 2. Archive logs
tar -czf logs_archive_$(date +%Y%m%d).tar.gz logs/

# 3. Export final metrics
node scripts/generate-final-report.js > final_metrics.json

# 4. Secure data transfer
rsync -avz backups/ secure-storage/hikeathon-2025/
```

### System Cleanup
```bash
# 1. Disable team access (keep data)
psql -c "UPDATE teams SET status = 'event_complete';"

# 2. Archive active sessions
psql -c "UPDATE teams SET session_data = NULL;"

# 3. Export final telemetry
node scripts/export-telemetry.js --final

# 4. Generate usage reports
node scripts/generate-usage-report.js > usage_summary.json
```

### Final Report Template
```markdown
# HIKEathon 2025 - Final Event Report

## Event Summary
- Duration: [Start] to [End]
- Total teams: [X]
- Platform uptime: [X]%
- Total interactions: [X]

## Performance Metrics
- Average response time: [X]ms
- Peak concurrent users: [X]
- Total API calls: [X]
- Error rate: [X]%

## Issues & Resolutions
- Total incidents: [X]
- Critical incidents: [X]
- Average resolution time: [X] minutes

## Recommendations
- [Improvement 1]
- [Improvement 2]
- [Infrastructure scaling needs]
```

---

**Remember**: Stay calm, communicate clearly, and document everything. The hackathon success depends on reliable platform operation and responsive support! 🏔️🚀