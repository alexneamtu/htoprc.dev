import { Link } from 'react-router-dom'
import { SEO } from '../components/SEO'

export function WhatIsHtoprcPage() {
  return (
    <div className="max-w-3xl mx-auto prose dark:prose-invert">
      <SEO
        title="What is an htoprc file?"
        description="Learn what the htoprc file is, where it lives, and why it makes your htop setup portable and shareable."
        url="/what-is-htoprc"
        type="article"
      />

      <h1>What is an htoprc file?</h1>

      <p>
        htoprc is the configuration file that tells htop how to render its interface. It is a
        plain text file that controls colors, meters, columns, sorting, and layout.
      </p>
      <p>
        When htop starts, it reads htoprc and applies those settings immediately. That means a
        single file can capture your full setup: which CPU meters are shown, whether tree view
        is enabled, and which columns are visible.
      </p>
      <p>
        On most systems, the file lives at <code>~/.config/htop/htoprc</code>. Older setups may
        use <code>~/.htoprc</code>. If you do not see either file, start htop, change a setting,
        and quit so it gets created.
      </p>
      <p>
        The key benefit is portability: you can move one file between machines, share it with
        teammates, or version it in your dotfiles.
      </p>

      <h2>Typical settings</h2>
      <ul>
        <li>
          <code>color_scheme=5</code> switches the theme.
        </li>
        <li>
          <code>tree_view=1</code> enables hierarchical process display.
        </li>
        <li>
          <code>fields=0 48 17 18 ...</code> controls which columns are visible.
        </li>
        <li>
          <code>header_layout=two_50_50</code> chooses the meter layout.
        </li>
      </ul>

      <p>
        If you want a shortcut, browse the <Link to="/gallery">gallery</Link>, open a config,
        and copy the final file. You can also use the <Link to="/editor">visual editor</Link>
        to tweak settings with a live preview.
      </p>
    </div>
  )
}
