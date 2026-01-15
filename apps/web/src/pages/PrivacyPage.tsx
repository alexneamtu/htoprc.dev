import { SEO } from '../components/SEO'

export function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto prose dark:prose-invert">
      <SEO
        title="Privacy Policy"
        description="Privacy policy for htoprc.dev - how we collect, use, and protect your data."
        url="/privacy"
      />

      <h1>Privacy Policy</h1>
      <p className="text-gray-500">Last updated: January 2026</p>

      <h2>Introduction</h2>
      <p>
        htoprc.dev ("we", "our", or "us") is committed to protecting your privacy.
        This Privacy Policy explains how we collect, use, and safeguard your information
        when you use our website.
      </p>

      <h2>Information We Collect</h2>

      <h3>Account Information</h3>
      <p>
        When you sign in using OAuth providers (GitHub, Google, or Discord), we receive:
      </p>
      <ul>
        <li>Your username or display name</li>
        <li>Your email address</li>
        <li>Your profile picture URL</li>
        <li>A unique identifier from the OAuth provider</li>
      </ul>

      <h3>User-Generated Content</h3>
      <p>
        We store content you voluntarily submit, including:
      </p>
      <ul>
        <li>htop configuration files you upload</li>
        <li>Comments you post on configurations</li>
        <li>Likes you give to configurations</li>
      </ul>

      <h3>Automatically Collected Information</h3>
      <p>
        We may collect standard web server logs including IP addresses, browser type,
        and pages visited for security and analytics purposes.
      </p>

      <h2>How We Use Your Information</h2>
      <p>We use the collected information to:</p>
      <ul>
        <li>Provide and maintain our service</li>
        <li>Display your username and avatar on content you create</li>
        <li>Moderate content and prevent abuse</li>
        <li>Improve our website and user experience</li>
        <li>Communicate with you about your account</li>
      </ul>

      <h2>Data Sharing</h2>
      <p>
        We do not sell your personal information. We may share data with:
      </p>
      <ul>
        <li>Service providers who assist in operating our website (e.g., Cloudflare for hosting)</li>
        <li>Authentication providers (Clerk) for managing sign-in</li>
        <li>Law enforcement when required by law</li>
      </ul>

      <h2>Data Retention</h2>
      <p>
        We retain your account information and content for as long as your account is active.
        You may request deletion of your data by contacting us.
      </p>

      <h2>Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you</li>
        <li>Request correction of inaccurate data</li>
        <li>Request deletion of your data</li>
        <li>Withdraw consent for data processing</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use essential cookies for authentication and session management.
        These are necessary for the website to function properly.
      </p>

      <h2>Third-Party Services</h2>
      <p>Our website uses the following third-party services:</p>
      <ul>
        <li><strong>Clerk</strong> - Authentication and user management</li>
        <li><strong>Cloudflare</strong> - Hosting and content delivery</li>
      </ul>

      <h2>Children's Privacy</h2>
      <p>
        Our service is not directed to children under 13. We do not knowingly collect
        personal information from children under 13.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of any
        changes by posting the new Privacy Policy on this page.
      </p>

      <h2>Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy, please open an issue on our{' '}
        <a href="https://github.com/alexneamtu/htoprc.dev" target="_blank" rel="noopener noreferrer">
          GitHub repository
        </a>.
      </p>
    </div>
  )
}
