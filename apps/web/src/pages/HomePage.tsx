import { HtopPreview } from '../components/htop/HtopPreview'
import { parseHtoprc } from '@htoprc/parser'

const SAMPLE_CONFIG = `htop_version=3.2.1
config_reader_min_version=3
fields=0 48 17 18 38 39 40 2 46 47 49 1
color_scheme=5
tree_view=1
header_layout=two_50_50
column_meters_0=AllCPUs Memory Swap
column_meter_modes_0=1 1 1
column_meters_1=Tasks LoadAverage Uptime
column_meter_modes_1=2 2 2`

export function HomePage() {
  const parsed = parseHtoprc(SAMPLE_CONFIG)

  return (
    <div>
      <section className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">htoprc.dev</h1>
        <p className="text-xl text-gray-400 mb-8">
          Browse, preview, and share htop configurations
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">Featured Config</h2>
        <div className="bg-gray-900 rounded-lg p-4">
          <HtopPreview config={parsed.config} />
        </div>
        <div className="mt-2 text-sm text-gray-500">
          Score: {parsed.score} | Version: {parsed.version}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Gallery</h2>
        <p className="text-gray-400">
          Coming soon - browse community htoprc configurations
        </p>
      </section>
    </div>
  )
}
