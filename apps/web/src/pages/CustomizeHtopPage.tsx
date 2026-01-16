import { Link } from 'react-router-dom'
import { SEO } from '../components/SEO'
import { Breadcrumbs } from '../components/Breadcrumbs'

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I change htop colors?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'htop ships with multiple color schemes you can select. You can also customize specific elements like CPU bars, process states, and UI accents through the htoprc configuration file.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I customize htop header meters?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The header shows CPU, memory, swap, load average, and more. Choose a layout in htop settings and then pick meters you actually watch every day.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I change which columns appear in htop?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The fields setting in htoprc controls which columns appear in the process list. A minimal set is PID, USER, CPU%, MEM%, TIME+, and Command.',
      },
    },
  ],
}

export function CustomizeHtopPage() {
  return (
    <div className="max-w-3xl mx-auto prose dark:prose-invert">
      <SEO
        title="Customize htop colors, meters, and columns"
        description="A practical guide to customizing htop colors, header meters, and process list columns."
        url="/customize-htop"
        type="article"
        jsonLd={faqSchema}
      />

      <Breadcrumbs items={[{ name: 'Customize htop', path: '/customize-htop' }]} />
      <h1>Customize htop colors, meters, and columns</h1>

      <p>
        The three most impactful tweaks are colors, header meters, and process list columns.
        Together they define the entire feel of your htop setup.
      </p>

      <h2>Colors</h2>
      <p>
        htop ships with multiple color schemes. You can also customize specific elements like
        CPU bars, process states, and UI accents. A high-contrast palette makes spikes easy
        to spot, while a muted palette reduces noise.
      </p>

      <h2>Header meters</h2>
      <p>
        The header shows CPU, memory, swap, load average, and more. Choose a layout and then
        pick meters you actually watch every day.
      </p>

      <h2>Process columns</h2>
      <p>
        The <code>fields</code> setting controls which columns appear in the process list. A
        minimal set is PID, USER, CPU%, MEM%, TIME+, and Command. Add IO or thread count only
        if it helps your workflow.
      </p>

      <h2>Quick workflow</h2>
      <ol>
        <li>
          Start from a config you like in the <Link to="/gallery">gallery</Link>.
        </li>
        <li>
          Open it in the <Link to="/editor">visual editor</Link>.
        </li>
        <li>Adjust meters, columns, and colors.</li>
        <li>
          Copy the resulting htoprc file into <code>~/.config/htop/htoprc</code>.
        </li>
      </ol>

      <h2>Related guides</h2>
      <ul>
        <li>
          <Link to="/what-is-htoprc">What is an htoprc file?</Link>
        </li>
        <li>
          <Link to="/htop-config-quick-guide">htop configuration quick guide</Link>
        </li>
      </ul>
    </div>
  )
}
