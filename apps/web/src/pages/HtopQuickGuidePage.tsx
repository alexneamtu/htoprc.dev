import { Link } from 'react-router-dom'
import { SEO } from '../components/SEO'

export function HtopQuickGuidePage() {
  return (
    <div className="max-w-3xl mx-auto prose dark:prose-invert">
      <SEO
        title="htop configuration quick guide"
        description="A fast checklist for setting up htop: layout, meters, columns, sorting, and color."
        url="/htop-config-quick-guide"
        type="article"
      />

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
    </div>
  )
}
