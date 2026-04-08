import { useState } from 'react';
import { cn } from './utils';

// Map company names to their domains for logo fetching
const COMPANY_DOMAINS: Record<string, string> = {
  'Google': 'google.com',
  'Meta': 'meta.com',
  'Amazon': 'amazon.com',
  'Apple': 'apple.com',
  'Netflix': 'netflix.com',
  'Microsoft': 'microsoft.com',
  'LinkedIn': 'linkedin.com',
  'Uber': 'uber.com',
  'Airbnb': 'airbnb.com',
  'TikTok': 'tiktok.com',
  'OpenAI': 'openai.com',
  'Anthropic': 'anthropic.com',
  'NVIDIA': 'nvidia.com',
  'Oracle': 'oracle.com',
  'SAP': 'sap.com',
  'IBM': 'ibm.com',
  'Cisco': 'cisco.com',
  'Adobe': 'adobe.com',
  'Intel': 'intel.com',
  'HP': 'hp.com',
  'Dell': 'dell.com',
  'VMware': 'vmware.com',
  'ServiceNow': 'servicenow.com',
  'Salesforce': 'salesforce.com',
  'Workday': 'workday.com',
  'HubSpot': 'hubspot.com',
  'Asana': 'asana.com',
  'Atlassian': 'atlassian.com',
  'Dropbox': 'dropbox.com',
  'Twilio': 'twilio.com',
  'Zillow': 'zillow.com',
  'Robinhood': 'robinhood.com',
  'Expedia': 'expedia.com',
  'Square / Block': 'block.xyz',
  'DocuSign': 'docusign.com',
  'Cloudflare': 'cloudflare.com',
  'Reddit': 'reddit.com',
  'Stripe': 'stripe.com',
  'Spotify': 'spotify.com',
  'Twitter': 'x.com',
  'X': 'x.com',
  'Snap': 'snap.com',
  'Snapchat': 'snap.com',
  'Pinterest': 'pinterest.com',
  'Slack': 'slack.com',
  'Zoom': 'zoom.us',
  'Shopify': 'shopify.com',
  'PayPal': 'paypal.com',
  'Coinbase': 'coinbase.com',
  'Databricks': 'databricks.com',
  'Snowflake': 'snowflake.com',
  'Palantir': 'palantir.com',
  'Figma': 'figma.com',
  'Notion': 'notion.so',
  'Vercel': 'vercel.com',
  'GitHub': 'github.com',
  'GitLab': 'gitlab.com',
  'ByteDance': 'bytedance.com',
  'Samsung': 'samsung.com',
  'Sony': 'sony.com',
  'Tesla': 'tesla.com',
  'Lyft': 'lyft.com',
  'DoorDash': 'doordash.com',
  'Instacart': 'instacart.com',
  'Roblox': 'roblox.com',
  'Unity': 'unity.com',
  'Epic Games': 'epicgames.com',
  'Walmart': 'walmart.com',
  'Target': 'target.com',
  'JPMorgan': 'jpmorgan.com',
  'JP Morgan': 'jpmorgan.com',
  'Goldman Sachs': 'goldmansachs.com',
  'Morgan Stanley': 'morganstanley.com',
  'Deloitte': 'deloitte.com',
  'McKinsey': 'mckinsey.com',
  'Accenture': 'accenture.com',
  // Banks & financial
  'BOC': 'boc.cn',
  'Bank of China': 'boc.cn',
  'Amex': 'americanexpress.com',
  'American Express': 'americanexpress.com',
  'BNY': 'bnymellon.com',
  'BNY Mellon': 'bnymellon.com',
  'The Bank of New York Mellon Corporation': 'bnymellon.com',
  'Citi': 'citigroup.com',
  'Citi Group': 'citigroup.com',
  'Citigroup': 'citigroup.com',
  'Citibank': 'citigroup.com',
  'HSBC': 'hsbc.com',
  'Barclays': 'barclays.com',
  'Wells Fargo': 'wellsfargo.com',
  'Bank of America': 'bankofamerica.com',
  'BofA': 'bankofamerica.com',
  'Capital One': 'capitalone.com',
  'Charles Schwab': 'schwab.com',
  'Fidelity': 'fidelity.com',
  'Visa': 'visa.com',
  'Mastercard': 'mastercard.com',
  'ADP': 'adp.com',
};

function getCompanyDomain(company: string): string | null {
  // Direct match
  if (COMPANY_DOMAINS[company]) return COMPANY_DOMAINS[company];

  // Case-insensitive match
  const lower = company.toLowerCase();
  for (const [name, domain] of Object.entries(COMPANY_DOMAINS)) {
    if (name.toLowerCase() === lower) return domain;
  }

  // Try to guess domain from company name (e.g., "Acme Corp" -> "acme.com")
  const simplified = company.replace(/\s*(Inc|Corp|LLC|Ltd|Co|Group|Technologies|Software|Labs|AI|Studios?|Games|Entertainment)\.?\s*/gi, '').trim();
  if (simplified && !simplified.includes(' ')) {
    return `${simplified.toLowerCase()}.com`;
  }

  return null;
}

function getLogoUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

interface CompanyLogoProps {
  company: string | undefined;
  className?: string;
  size?: 'sm' | 'md';
}

export function CompanyLogo({ company, className, size = 'md' }: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);

  const domain = company ? getCompanyDomain(company) : null;
  const logoUrl = domain ? getLogoUrl(domain) : null;
  const fallbackLetter = company?.[0] || '?';

  const sizeClasses = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';

  if (!logoUrl || failed) {
    return (
      <div
        className={cn(
          sizeClasses,
          'rounded-lg bg-[hsl(220,20%,97%)] border border-[hsl(220,16%,90%)] flex items-center justify-center text-sm font-bold text-[hsl(222,22%,15%)] shrink-0',
          className,
        )}
      >
        {fallbackLetter}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={`${company} logo`}
      className={cn(sizeClasses, 'rounded-lg object-contain shrink-0', className)}
      onError={() => setFailed(true)}
    />
  );
}
