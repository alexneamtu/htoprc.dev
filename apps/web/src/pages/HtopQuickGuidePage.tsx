import { Link } from 'react-router-dom'
import { SEO } from '../components/SEO'
import { Breadcrumbs } from '../components/Breadcrumbs'

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Configure htop',
  description: 'A fast checklist for setting up htop: layout, meters, columns, sorting, and color.',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Pick a base config',
      text: 'Start from a config that already looks close to what you want. It is faster than building from scratch.',
    },
    {
      '@type': 'HowToStep',
      name: 'Set the meter layout',
      text: 'Choose a header layout and add meters you actually watch: per-core CPU, memory, swap, and load.',
    },
    {
      '@type': 'HowToStep',
      name: 'Tighten the process list',
      text: 'Remove columns you never use and add the ones you always check. A minimal set is PID, USER, CPU%, MEM%, TIME+, and Command.',
    },
    {
      '@type': 'HowToStep',
      name: 'Tune sort order',
      text: 'Sort by CPU or memory based on what you typically investigate.',
    },
    {
      '@type': 'HowToStep',
      name: 'Adjust colors last',
      text: 'Once the layout is right, pick a color scheme you can read easily for long sessions.',
    },
    {
      '@type': 'HowToStep',
      name: 'Save and test',
      text: 'Save to ~/.config/htop/htoprc (or ~/.htoprc) and relaunch htop to confirm it looks right.',
    },
  ],
}

export function HtopQuickGuidePage() {
  return (
    <div className="max-w-3xl mx-auto prose dark:prose-invert">
      <SEO
        title="htop configuration quick guide"
        description="A fast checklist for setting up htop: layout, meters, columns, sorting, and color."
        url="/htop-config-quick-guide"
        type="article"
        jsonLd={howToSchema}
      />

      <Breadcrumbs items={[{ name: 'Quick Guide', path: '/htop-config-quick-guide' }]} />
      <h1>htop configuration quick guide</h1>

      <h2>1) Pick a base config</h2>
      <p>
        Start from a config that already looks close to what you want. It is faster than
        building from scratch.
      </p>

      <h2>2) Set the meter layout</h2>
      <p>
        Choose a header layout and add meters you actually watch: per-core CPU, memory, swap,
        and load.
      </p>

      <h2>3) Tighten the process list</h2>
      <p>
        Remove columns you never use and add the ones you always check. A minimal set is PID,
        USER, CPU%, MEM%, TIME+, and Command.
      </p>

      <h2>4) Tune sort order</h2>
      <p>Sort by CPU or memory based on what you typically investigate.</p>

      <h2>5) Adjust colors last</h2>
      <p>Once the layout is right, pick a color scheme you can read easily for long sessions.</p>

      <h2>6) Save and test</h2>
      <p>
        Save to <code>~/.config/htop/htoprc</code> (or <code>~/.htoprc</code>) and relaunch htop
        to confirm it looks right.
      </p>

      <p>
        Want a faster workflow? Use the <Link to="/editor">visual editor</Link> to tweak
        settings with a live preview, or browse the <Link to="/gallery">gallery</Link>.
      </p>

      <h2>Related guides</h2>
      <ul>
        <li>
          <Link to="/what-is-htoprc">What is an htoprc file?</Link>
        </li>
        <li>
          <Link to="/customize-htop">Customize htop colors, meters, and columns</Link>
        </li>
      </ul>
    </div>
  )
}
