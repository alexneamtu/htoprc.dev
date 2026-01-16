# @htoprc/parser

Parse and serialize [htop](https://htop.dev/) configuration files (htoprc).

## Features

- Parse htoprc files into typed TypeScript objects
- Serialize config objects back to htoprc format
- Support for htop 2.x and 3.x config formats
- Zero runtime dependencies
- Full TypeScript support

## Installation

```bash
npm install @htoprc/parser
```

## Usage

### Parsing an htoprc file

```typescript
import { parseHtoprc } from '@htoprc/parser'
import { readFileSync } from 'fs'

const content = readFileSync('~/.config/htop/htoprc', 'utf-8')
const result = parseHtoprc(content)

console.log(result.config.colorScheme)     // 0
console.log(result.config.treeView)        // true
console.log(result.config.leftMeters)      // [{ type: 'CPU', mode: 'bar' }, ...]
console.log(result.version)                // 'v3' | 'v2' | 'unknown'
console.log(result.warnings)               // Any parsing warnings
```

### Serializing a config

```typescript
import { serializeHtoprc, parseHtoprc } from '@htoprc/parser'

const result = parseHtoprc(content)

// Modify the config
result.config.colorScheme = 5
result.config.treeView = true

// Serialize back to htoprc format
const output = serializeHtoprc(result.config)
// Write to ~/.config/htop/htoprc
```

### Serialization options

```typescript
import { serializeHtoprc } from '@htoprc/parser'

const output = serializeHtoprc(config, {
  includeVersion: true,      // Include htop_version if present (default: true)
  onlyNonDefaults: false,    // Only include options that differ from defaults (default: false)
  includeUnknown: true,      // Include unknown options (default: true)
})
```

## API

### `parseHtoprc(input: string): ParseResult`

Parses an htoprc configuration string.

Returns a `ParseResult` object:

```typescript
interface ParseResult {
  config: HtopConfig      // Parsed configuration
  warnings: ParseWarning[] // Non-fatal parsing issues
  errors: ParseError[]    // Fatal parsing errors
  version: 'v2' | 'v3' | 'unknown'
  score: number           // Config "interestingness" score
}
```

### `serializeHtoprc(config: HtopConfig, options?: SerializeOptions): string`

Serializes an `HtopConfig` object back to htoprc format.

### `DEFAULT_CONFIG`

The default htoprc configuration values.

## Types

### `HtopConfig`

The main configuration interface with all htop settings:

- Display options: `colorScheme`, `headerLayout`, `showProgramPath`, etc.
- Header meters: `leftMeters`, `rightMeters`
- Process list: `columns`, `sortKey`, `sortDirection`, `treeView`
- Threading: `hideKernelThreads`, `hideUserlandThreads`
- Screen definitions (htop 3.x): `screens`

### `Meter`

```typescript
interface Meter {
  type: string        // e.g., 'CPU', 'Memory', 'LoadAverage'
  mode: MeterMode     // 'bar' | 'text' | 'graph' | 'led'
}
```

### `HeaderLayout`

Supported header layouts:

- `two_50_50` (default)
- `two_33_67`, `two_67_33`
- `three_33_34_33`, `three_25_25_50`, `three_25_50_25`, `three_50_25_25`
- `four_25_25_25_25`

## Related

- [htoprc.dev](https://htoprc.dev) - Visual htoprc editor and config gallery
- [htop](https://htop.dev/) - Interactive process viewer

## License

MIT
