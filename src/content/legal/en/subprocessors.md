# Subprocessors

_Last updated: {{lastUpdated}}_

{{company.tradeName}} uses a small number of outside companies to run the service. This page lists every third party that receives data from us, what they do and what data they get. It also lists the kinds of services we deliberately do **not** use.

## Third parties we use

| Provider | What they do for us | Data they receive | Loaded in your browser? | Required? |
| --- | --- | --- | --- | --- |
| Supabase (PostgreSQL database, authentication, file storage) | Stores business accounts, ratings and settings; signs in dashboard users; stores business logos. | Dashboard account email and hashed password; business data; anonymous ratings. No customer personal data. | No | Yes |
| Vercel (hosting) | Serves the website and runs the server code. | Standard request data (IP address, user agent) processed briefly to deliver pages. We do not use Vercel Analytics. | No | Yes |
| Google (Google Business Profile) | Only when a customer chooses to tap "Leave a Google Review" are they sent to the business's Google review page. Nothing loads from Google before that tap. | Nothing is sent by {{company.tradeName}}. Google's own privacy policy applies once you are on Google. | No | No |

Our data is hosted in {{company.hostingRegion}}.

Google is not strictly a subprocessor, because we do not send it any data. We list it here so you know exactly when a customer leaves our site. Google is a trademark of Google LLC. {{company.tradeName}} is not affiliated with, sponsored by or endorsed by Google.

## Things we do not use

We deliberately do not use:

- Advertising or retargeting pixels (Meta, Google Ads, TikTok…)
- Third-party analytics (Google Analytics, Hotjar, Mixpanel…)
- Social media embed scripts
- Externally hosted fonts or CDNs (fonts are self-hosted)
- Device fingerprinting or precise location

## Changes to this list

We will update this page before we start using a new third party that receives personal data. If you have a business account and the change is important, we will also tell you by email or in the dashboard.

## Questions

Email {{company.privacyEmail}}. For more detail, see our [Privacy Policy](/legal/privacy).
