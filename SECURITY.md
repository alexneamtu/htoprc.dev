# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately:

1. **Do NOT** open a public GitHub issue
2. Use [GitHub's private vulnerability reporting](https://github.com/alexneamtu/htoprc.dev/security/advisories/new)

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response timeline

- **24 hours**: Acknowledgment of report
- **72 hours**: Initial assessment
- **7 days**: Fix deployed (for critical issues)

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |

## Security Measures

This project implements:

- Input validation on all user inputs
- Rate limiting on mutations
- Authorization checks on admin endpoints
- SQL injection prevention via parameterized queries
- XSS prevention via URL validation
- Content moderation for untrusted users
- Dependabot security updates
- CodeQL code scanning
