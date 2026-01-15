import { Link } from 'react-router-dom'
import { SEO } from '../components/SEO'

export function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto prose dark:prose-invert">
      <SEO
        title="About"
        description="About htoprc.dev - a visual htop configuration editor and gallery for sharing htop configs."
        url="/about"
      />

      <h1>About htoprc.dev</h1>

      <p className="lead">
        htoprc.dev is a community-driven platform for creating, sharing, and discovering
        beautiful htop configurations.
      </p>

      <h2>What is htop?</h2>
      <p>
        <a href="https://htop.dev" target="_blank" rel="noopener noreferrer">htop</a> is
        an interactive process viewer for Unix systems. It's a powerful alternative to the
        traditional <code>top</code> command, featuring a more user-friendly interface,
        mouse support, and extensive customization options.
      </p>

      <h2>What We Offer</h2>

      <h3>Visual Editor</h3>
      <p>
        Our <Link to="/editor">visual editor</Link> lets you customize your htop configuration
        with a live preview. See exactly how your changes will look before applying them.
      </p>

      <h3>Configuration Gallery</h3>
      <p>
        Browse our <Link to="/">gallery</Link> of community-submitted configurations. Find
        inspiration from other users' setups, sorted by popularity or customization level.
      </p>

      <h3>Easy Sharing</h3>
      <p>
        Share your perfect htop setup with the community. Upload your configuration and
        let others discover and fork your work.
      </p>

      <h2>Features</h2>
      <ul>
        <li><strong>Live Preview</strong> - See your configuration rendered in real-time</li>
        <li><strong>Syntax Validation</strong> - Get warnings for invalid or deprecated options</li>
        <li><strong>Score System</strong> - Configurations are scored based on customization level</li>
        <li><strong>Fork & Remix</strong> - Start from any configuration and make it your own</li>
        <li><strong>Comments & Likes</strong> - Engage with the community</li>
      </ul>

      <h2>Open Source</h2>
      <p>
        htoprc.dev is open source and available on{' '}
        <a href="https://github.com/alexneamtu/htoprc.dev" target="_blank" rel="noopener noreferrer">
          GitHub
        </a>. Contributions are welcome!
      </p>

      <h2>Technology Stack</h2>
      <ul>
        <li>React with TypeScript</li>
        <li>Cloudflare Workers & D1 Database</li>
        <li>GraphQL API</li>
        <li>Tailwind CSS</li>
      </ul>

      <h2>Contact</h2>
      <p>
        Have questions, suggestions, or found a bug? Please open an issue on our{' '}
        <a href="https://github.com/alexneamtu/htoprc.dev/issues" target="_blank" rel="noopener noreferrer">
          GitHub repository
        </a>.
      </p>

      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500">
          htoprc.dev is not affiliated with the htop project. htop is developed by{' '}
          <a href="https://htop.dev" target="_blank" rel="noopener noreferrer">htop.dev</a>.
        </p>
      </div>
    </div>
  )
}
