/**
 * Archive Tools - Zip/Unzip Operations
 * Compress and decompress files
 */

import type { Tool, ToolImpl } from '../../types/tools'

// Compress Files Tool
export const archiveCompressImpl: ToolImpl = async (args, extras) => {
  const {
    sourcePath,
    outputPath,
    compressionLevel = 6
  } = args as {
    sourcePath: string | string[]
    outputPath: string
    compressionLevel?: number
  }

  try {
    const sources = Array.isArray(sourcePath) ? sourcePath : [sourcePath]

    // Use Node.js zlib via terminal command
    const command =
      process.platform === 'win32'
        ? `powershell Compress-Archive -Path "${sources.join(',')}" -DestinationPath "${outputPath}" -CompressionLevel Optimal -Force`
        : `zip -${compressionLevel} -r "${outputPath}" ${sources.map((s) => `"${s}"`).join(' ')}`

    await extras.ide.terminal.exec(command)

    return [
      {
        name: 'Archive Created',
        description: `Compressed ${sources.length} item(s)`,
        content: `# Archive Created\n\n**Output**: ${outputPath}\n**Sources**: ${sources.join(', ')}\n**Compression**: Level ${compressionLevel}\n\n✓ Successfully created archive`
      }
    ]
  } catch (error) {
    throw new Error(
      `Archive compression failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const archiveCompressTool: Tool = {
  type: 'function',
  category: 'file',
  displayTitle: 'Compress Archive',
  wouldLikeTo: 'compress files',
  isCurrently: 'compressing files',
  hasAlready: 'compressed files',
  readonly: false,
  isInstant: false,
  group: 'file',
  icon: 'ArchiveIcon',
  function: {
    name: 'archive_compress',
    description:
      'Compress files/directories into a zip archive. Supports single or multiple sources.',
    parameters: {
      type: 'object',
      required: ['sourcePath', 'outputPath'],
      properties: {
        sourcePath: {
          type: 'string',
          description: 'File or directory path to compress (can be comma-separated for multiple)'
        },
        outputPath: {
          type: 'string',
          description: 'Output zip file path'
        },
        compressionLevel: {
          type: 'number',
          description: 'Compression level 0-9 (default: 6)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: archiveCompressImpl
}

// Extract Archive Tool
export const archiveExtractImpl: ToolImpl = async (args, extras) => {
  const {
    archivePath,
    outputDir,
    overwrite = false
  } = args as {
    archivePath: string
    outputDir: string
    overwrite?: boolean
  }

  try {
    // Ensure output directory exists
    await extras.ide.fs.writeFile(outputDir + '/.gitkeep', '')

    // Extract using platform-specific command
    const command =
      process.platform === 'win32'
        ? `powershell Expand-Archive -Path "${archivePath}" -DestinationPath "${outputDir}" ${overwrite ? '-Force' : ''}`
        : `unzip ${overwrite ? '-o' : '-n'} "${archivePath}" -d "${outputDir}"`

    await extras.ide.terminal.exec(command)

    return [
      {
        name: 'Archive Extracted',
        description: `Extracted to ${outputDir}`,
        content: `# Archive Extracted\n\n**Archive**: ${archivePath}\n**Output Directory**: ${outputDir}\n**Overwrite**: ${overwrite ? 'Yes' : 'No'}\n\n✓ Successfully extracted archive`
      }
    ]
  } catch (error) {
    throw new Error(
      `Archive extraction failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const archiveExtractTool: Tool = {
  type: 'function',
  category: 'file',
  displayTitle: 'Extract Archive',
  wouldLikeTo: 'extract archive',
  isCurrently: 'extracting archive',
  hasAlready: 'extracted archive',
  readonly: false,
  isInstant: false,
  group: 'file',
  icon: 'ArchiveIcon',
  function: {
    name: 'archive_extract',
    description: 'Extract files from a zip archive to a directory.',
    parameters: {
      type: 'object',
      required: ['archivePath', 'outputDir'],
      properties: {
        archivePath: {
          type: 'string',
          description: 'Path to the zip archive to extract'
        },
        outputDir: {
          type: 'string',
          description: 'Directory to extract files to'
        },
        overwrite: {
          type: 'boolean',
          description: 'Overwrite existing files (default: false)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: archiveExtractImpl
}

// List Archive Contents Tool
export const archiveListImpl: ToolImpl = async (args, extras) => {
  const { archivePath } = args as {
    archivePath: string
  }

  try {
    // List contents using platform-specific command
    const command =
      process.platform === 'win32'
        ? `powershell "Add-Type -Assembly System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::OpenRead('${archivePath}').Entries | Select-Object FullName, Length | Format-Table -AutoSize"`
        : `unzip -l "${archivePath}"`

    const result = await extras.ide.terminal.exec(command)

    return [
      {
        name: 'Archive Contents',
        description: `Listed contents of ${archivePath}`,
        content: `# Archive Contents\n\n**Archive**: ${archivePath}\n\n\`\`\`\n${result.success ? result.data?.stdout : 'No contents'}\n\`\`\``
      }
    ]
  } catch (error) {
    throw new Error(
      `Archive list failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const archiveListTool: Tool = {
  type: 'function',
  category: 'file',
  displayTitle: 'List Archive',
  wouldLikeTo: 'list archive contents',
  isCurrently: 'listing archive',
  hasAlready: 'listed archive',
  readonly: true,
  isInstant: true,
  group: 'file',
  icon: 'ArchiveIcon',
  function: {
    name: 'archive_list',
    description: 'List contents of a zip archive without extracting.',
    parameters: {
      type: 'object',
      required: ['archivePath'],
      properties: {
        archivePath: {
          type: 'string',
          description: 'Path to the zip archive'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: archiveListImpl
}
