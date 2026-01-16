import { Link } from 'react-router-dom'
import { SEO } from '../components/SEO'

export function CustomizeHtopPage() {
  return (
    <div className="max-w-3xl mx-auto prose dark:prose-invert">
      <SEO
        title="Customize htop colors, meters, and columns"
        description="A practical guide to customizing htop colors, header meters, and process list columns."
        url="/customize-htop"
        type="article"
      />

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
    </div>
  )
}
