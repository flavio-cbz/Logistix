# Troubleshooting Guide

This guide helps you resolve common issues encountered while developing or deploying LogistiX.

## Common Issues

### 1. Build and Development Issues

#### TypeScript Compilation Errors

**Problem**: TypeScript compilation fails with multiple errors.

**Solution**:
```bash
# Check TypeScript configuration
npm run type-check

# Fix common issues
npm run lint:fix

# Clean build cache
npm run clean
npm run build
```

**Common TypeScript Issues**:
- `exactOptionalPropertyTypes: true` causing strict type checking
- Unused variables and imports
- Type mismatches with `string | undefined` vs `string`

#### Next.js Build Failures

**Problem**: Next.js build fails or produces warnings.

**Solution**:
```bash
# Clean Next.js cache
rm -rf .next
npm run build

# Check for webpack issues
npm run build:analyze
```

#### Port Already in Use

**Problem**: Development server fails to start on port 3000.

**Solution**:
```bash
# Kill process using port 3000
npx kill-port 3000

# Or use a different port
PORT=3001 npm run dev
```

### 2. Database Issues

#### Database Connection Errors

**Problem**: Cannot connect to SQLite database.

**Solution**:
```bash
# Check database file exists
ls -la data/logistix.db

# Recreate database if corrupted
npm run db:migrate

# Check database permissions
chmod 644 data/logistix.db
```

#### Database Lock Errors

**Problem**: `SQLITE_BUSY` or database locked errors.

**Solution**:
```bash
# Check for hanging connections
lsof data/logistix.db

# Restart the application
npm run dev
```

#### Migration Failures

**Problem**: Database migrations fail to run.

**Solution**:
```bash
# Check migration scripts
node scripts/migrate.js

# Backup and restore if needed
npm run db:backup
npm run db:restore
```

### 3. Authentication Issues

#### JWT Token Errors

**Problem**: Authentication fails with invalid token errors.

**Solution**:
1. Check JWT_SECRET in environment variables
2. Clear browser cookies and localStorage
3. Verify token expiration settings

```bash
# Check environment variables
cat .env.local

# Regenerate JWT secret
openssl rand -base64 32
```

#### Login/Logout Issues

**Problem**: Users cannot log in or logout properly.

**Solution**:
1. Check authentication middleware
2. Verify password hashing
3. Clear session data

```javascript
// Clear browser storage
localStorage.clear();
sessionStorage.clear();
```

### 4. Test Issues

#### Unit Test Failures

**Problem**: Vitest tests fail with mock or import errors.

**Solution**:
```bash
# Run tests with verbose output
npm run test -- --reporter=verbose

# Check test setup
cat vitest-setup.js

# Fix mock issues
npm run test -- --no-coverage
```

#### E2E Test Failures

**Problem**: Playwright tests fail or timeout.

**Solution**:
```bash
# Run tests in headed mode
npx playwright test --headed

# Check test configuration
cat playwright.config.ts

# Update browser binaries
npx playwright install
```

### 5. Performance Issues

#### Slow Database Queries

**Problem**: Database operations are slow.

**Solution**:
1. Check database indexes
2. Analyze query performance
3. Enable WAL mode

```sql
-- Check query plan
EXPLAIN QUERY PLAN SELECT * FROM produits WHERE user_id = ?;

-- Enable WAL mode
PRAGMA journal_mode=WAL;
```

#### High Memory Usage

**Problem**: Application consumes too much memory.

**Solution**:
1. Check for memory leaks
2. Optimize database connections
3. Review logging configuration

```bash
# Monitor memory usage
node --inspect npm run dev

# Check for memory leaks
npm run build:analyze
```

### 6. Deployment Issues

#### Docker Build Failures

**Problem**: Docker build fails or produces large images.

**Solution**:
```bash
# Check Dockerfile
cat Dockerfile

# Build with verbose output
docker build --no-cache -t logistix .

# Optimize image size
docker build --target production .
```

#### Environment Variable Issues

**Problem**: Environment variables not loaded correctly.

**Solution**:
1. Check .env file format
2. Verify variable names
3. Restart the application

```bash
# Check environment variables
printenv | grep -i logistix

# Validate .env file
cat .env.local
```

### 7. API Issues

#### CORS Errors

**Problem**: Cross-origin requests blocked.

**Solution**:
1. Configure CORS headers in middleware
2. Check API endpoint configuration
3. Verify request origins

```javascript
// Add CORS headers
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
```

#### API Rate Limiting

**Problem**: API requests being rate limited.

**Solution**:
1. Check rate limiting configuration
2. Implement proper retry logic
3. Optimize API usage

### 8. Logging Issues

#### Missing Log Files

**Problem**: Log files not being created.

**Solution**:
```bash
# Check logs directory permissions
ls -la logs/

# Create logs directory if missing
mkdir -p logs

# Check Winston configuration
cat lib/utils/logging/logger.ts
```

#### Log Rotation Issues

**Problem**: Log files growing too large.

**Solution**:
1. Configure log rotation properly
2. Set appropriate log levels
3. Clean old log files

```bash
# Clean old logs
find logs/ -name "*.log" -mtime +30 -delete
```

## Debugging Tips

### 1. Enable Debug Mode

```bash
# Enable debug logging
DEBUG=* npm run dev

# Enable Next.js debug mode
NODE_OPTIONS='--inspect' npm run dev
```

### 2. Database Debugging

```sql
-- Enable SQLite debugging
PRAGMA compile_options;

-- Check database integrity
PRAGMA integrity_check;

-- Analyze database statistics
PRAGMA table_info(produits);
```

### 3. Network Debugging

```bash
# Check network requests
curl -v http://localhost:3000/api/v1/health

# Monitor network traffic
netstat -tulpn | grep :3000
```

### 4. Browser Debugging

1. Open browser developer tools
2. Check console for JavaScript errors
3. Monitor network requests
4. Inspect local storage and cookies

## Getting Help

### 1. Check Logs

Always check the application logs first:
```bash
# Application logs
tail -f logs/application.log

# Error logs
tail -f logs/error.log

# Development console
npm run dev
```

### 2. Verify Configuration

Check all configuration files:
- `next.config.js`
- `tsconfig.json`
- `package.json`
- `.env.local`

### 3. Test in Isolation

Isolate the problem:
1. Create minimal reproduction case
2. Test individual components
3. Check dependencies

### 4. Community Resources

- Check GitHub issues
- Review documentation
- Search Stack Overflow
- Check Next.js documentation

## Prevention

### 1. Regular Maintenance

```bash
# Update dependencies
npm audit fix
npm update

# Clean build artifacts
npm run clean

# Run tests regularly
npm run test
npm run test:e2e
```

### 2. Monitoring

Set up monitoring for:
- Application errors
- Performance metrics
- Database health
- Security events

### 3. Backup Strategy

```bash
# Regular database backups
npm run db:backup

# Code backups
git push origin main

# Configuration backups
cp .env.local .env.backup
```

## Emergency Procedures

### 1. Database Recovery

```bash
# Restore from backup
npm run db:restore

# Reset database if corrupted
rm data/logistix.db
npm run db:migrate
```

### 2. Application Recovery

```bash
# Reset to last known good state
git reset --hard HEAD~1

# Clean install
rm -rf node_modules
npm install
```

### 3. Security Incident

1. Change all passwords and secrets
2. Review access logs
3. Update security configurations
4. Notify users if necessary