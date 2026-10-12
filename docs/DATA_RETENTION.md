# Data inventory & retention

## What we collect

| Data | From | Personal data? | Purpose | Retention |
| --- | --- | --- | --- | --- |
| Rating (1–5), business, location, card, source (nfc/qr/link), timestamp | Customers | **No.** No name, email, phone, IP, device ID or location | Feedback analytics for the business | Business setting, 1–60 months (default 24), then deleted automatically |
| Daily counters (page views, NFC taps, QR scans, submissions, Google button taps) | Customers | No. Aggregate counts only | Funnel analytics | Same as ratings |
| Salted SHA-256 hash of IP + daily salt | Any visitor submitting a form | Pseudonymous, short-lived | Rate limiting / abuse prevention | ≤ 1 day |
| Name, email, hashed password | Business users | Yes | Account and sign-in | Until account deletion (+ up to 30 days for backups) |
| Business profile (name, logo, address, hours, phone, website, social links, Google link) | Business users | Business info; may include a contact person | Customer page | Until the business is deleted |
| Contact form: name, email, business name, message, marketing opt-in | Visitors | Yes | Replying to the request | 12 months |
| Marketing subscription: email, consent time and source, unsubscribe time, token hash | Opt-in only | Yes | Product news | Until unsubscribe; the record of the unsubscribe is kept so it is honoured |
| Deletion requests | Anyone | Yes (email) | Handling data-rights requests | 24 months after resolution |
| Audit logs | System | Ids only | Security and accountability | 24 months |
| Invoices | System | Business billing data | Accounting obligations | As long as accounting law requires (outside automatic deletion) |
| Cookies | Visitors | See `/legal/cookies` | Sign-in, consent, language | See the cookie table |

## Automatic deletion

`purge_expired_data()` (Postgres) or `repo.maintenance.purgeExpiredData()` (demo) runs daily from `/api/cron/retention` (Vercel Cron, 03:30 UTC).

## Data rights

| Right | How to exercise it |
| --- | --- |
| Export | Dashboard → Privacy → CSV/JSON (manager+), or `/api/export/<id>` |
| Deletion | `/data-deletion` (anyone), or Dashboard → Privacy (signed-in users). Requests are queued in Admin → Data deletion requests and verified by email before deletion. |
| Unsubscribe | One-click link in every marketing email, or `/unsubscribe`, or RFC 8058 `List-Unsubscribe-Post` |

## Children

The customer flow collects no personal data, so there's nothing to collect from minors. Dashboard accounts require users to be 18+ (stated at sign-up). Never add fields that ask customers for age, name, email or phone. If a future feature needs personal data from customers, it must get a privacy review first, including safeguards for minors appropriate to the jurisdiction.
