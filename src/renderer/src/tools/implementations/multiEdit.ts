/**
 * Multi Edit Tool
 * Performs multiple sequential find-and-replace operations atomically
 * Based on Continue.dev's multiEditTool
 */

import type { Tool, ToolImpl, ContextItem } from '../../types/tools'
import { getStringArg, getArrayArg } from '../parseArgs'

const TOOL_NAME = 'multi_edit'
const TOOL_GROUP = 'built-in'

export interface EditOperation {
  old_string: string
  new_string: string
  replace_all?: boolean
}

/**
 * Validate multi-edit arguments
 */
function validateMultiEdit(edits: EditOperation[]): EditOperation[] {
  if (!Array.isArray(edits) || edits.length === 0) {
    throw new Error('edits must be a non-empty array')
  }

  edits.forEach((edit, index) => {
    if (!edit.old_string || !edit.old_string.trim()) {
      throw new Error(`Edit ${index + 1}: old_string cannot be empty or whitespace-only`)
    }

    if (edit.new_string === undefined || edit.new_string === null) {
      throw new Error(`Edit ${index + 1}: new_string is required (can be empty string to delete)`)
    }

    if (edit.old_string === edit.new_string) {
      throw new Error(`Edit ${index + 1}: old_string and new_string must be different`)
    }
  })

  return edits
}

/**
 * Execute multiple find-and-replace operations sequentially
 * Each edit operates on the result of the previous edit
 */
function executeMultiFindAndReplace(content: string, edits: EditOperation[]): string {
  let currentContent = content

  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i]
    const { old_string, new_string, replace_all = false } = edit

    if (!replace_all) {
      // Single replacement - check uniqueness
      const occurrences = currentContent.split(old_string).length - 1

      if (occurrences === 0) {
        throw new Error(
          `Edit ${i + 1}: Could not find old_string in file. ` +
            `Note: Earlier edits may have changed the file content. ` +
            `Make sure old_string matches the expected state after previous edits.`
        )
      }

      if (occurrences > 1) {
        throw new Error(
          `Edit ${i + 1}: Found ${occurrences} occurrences of old_string. ` +
            `Either provide more context or use replace_all: true`
        )
      }

      currentContent = currentContent.replace(old_string, new_string)
    } else {
      // Replace all occurrences
      const regex = new RegExp(escapeRegex(old_string), 'g')
      const occurrences = (currentContent.match(regex) || []).length

      if (occurrences === 0) {
        throw new Error(
          `Edit ${i + 1}: Could not find old_string in file. ` +
            `Earlier edits may have changed the content.`
        )
      }

      currentContent = currentContent.replace(regex, new_string)
    }
  }

  return currentContent
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Tool implementation
 */
export const multiEditImpl: ToolImpl = async (args, extras) => {
  const filepath = getStringArg(args, 'filepath')
  const edits = getArrayArg<EditOperation>(args, 'edits', true)

  if (!edits) {
    throw new Error('edits parameter is required')
  }

  try {
    // Validate all edits upfront
    const validatedEdits = validateMultiEdit(edits)

    // Read current file content
    const readResult = await extras.ide.fs.readFile(filepath)
    if (!readResult.success || !readResult.data) {
      throw new Error(readResult.error || 'Failed to read file')
    }

    const originalContent = readResult.data

    // Execute all edits (atomic - if any fails, none are applied)
    let newContent: string
    try {
      newContent = executeMultiFindAndReplace(originalContent, validatedEdits)
    } catch (editError) {
      // Edit execution failed - file remains unchanged
      throw new Error(
        `Atomic edit failed (file unchanged): ${editError instanceof Error ? editError.message : String(editError)}`
      )
    }

    // All edits successful - write modified content
    const writeResult = await extras.ide.fs.writeFile(filepath, newContent)
    if (!writeResult.success) {
      throw new Error(writeResult.error || 'Failed to write file')
    }

    // Calculate statistics
    const oldLines = originalContent.split('\n').length
    const newLines = newContent.split('\n').length
    const linesAdded = Math.max(0, newLines - oldLines)
    const linesRemoved = Math.max(0, oldLines - newLines)

    // Count total replacements
    let totalReplacements = 0
    let currentCheckContent = originalContent
    for (const edit of validatedEdits) {
      const replaceAll = edit.replace_all ?? false
      if (replaceAll) {
        const regex = new RegExp(escapeRegex(edit.old_string), 'g')
        totalReplacements += (currentCheckContent.match(regex) || []).length
      } else {
        totalReplacements += 1
      }
      currentCheckContent = currentCheckContent.replace(
        replaceAll ? new RegExp(escapeRegex(edit.old_string), 'g') : edit.old_string,
        edit.new_string
      )
    }

    const contextItem: ContextItem = {
      name: filepath.split(/[\\/]/).pop() || filepath,
      description: filepath,
      content: `Successfully applied ${edits.length} edit operation(s)`,
      status: 'Edited',
      uri: {
        type: 'file',
        value: filepath
      }
    }

    // Detailed metadata
    const metadataItem: ContextItem = {
      name: 'Multi-Edit Summary',
      description: 'Changes made to file',
      content: `File: ${filepath}\nTotal edits: ${edits.length}\nTotal replacements: ${totalReplacements}\nLines added: ${linesAdded}\nLines removed: ${linesRemoved}\n\nAll edits applied atomically (all-or-nothing).`
    }

    return [contextItem, metadataItem]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to apply multi-edit to "${filepath}": ${errorMessage}`)
  }
}

/**
 * Tool definition
 */
export const multiEditTool: Tool = {
  type: 'function',
  category: 'file',
  displayTitle: 'Multi Edit',
  wouldLikeTo: 'edit {{{ filepath }}}',
  isCurrently: 'editing {{{ filepath }}}',
  hasAlready: 'edited {{{ filepath }}}',
  readonly: false,
  isInstant: false,
  group: TOOL_GROUP,
  icon: 'PencilSquareIcon',
  function: {
    name: TOOL_NAME,
    description: `Use this tool to make multiple edits to a single file in one operation. Allows multiple find-and-replace operations efficiently.

To make multiple edits to a file, provide:
1. filepath: The path to the file (relative to workspace root)
2. edits: Array of edit operations, each with:
   - old_string: Text to replace (exact match including whitespace)
   - new_string: Text to replace it with
   - replace_all: Replace all occurrences (optional, default: false)

IMPORTANT:
- Files may be modified between tool calls by users/linters, so make all edits in ONE tool call
- All edits are applied SEQUENTIALLY in the order provided
- Each edit operates on the result of the previous edit
- Edits are ATOMIC - all edits succeed or none are applied
- This tool is ideal for making several changes to different parts of the same file

CRITICAL REQUIREMENTS:
1. ALWAYS use read_file tool just before making edits to see up-to-date contents
2. This tool CANNOT be called in parallel with other tools
3. When making edits:
   - Ensure all edits result in idiomatic, correct code
   - Do not leave the code in a broken state
   - Only use emojis if user explicitly requests it
   - Use replace_all for renaming variables across the file

WARNINGS:
- If earlier edits affect text that later edits are trying to find, tool will fail
- Tool will fail if old_string doesn't match file contents exactly (including whitespace)
- Tool will fail if old_string and new_string are the same - they MUST be different`,
    parameters: {
      type: 'object',
      required: ['filepath', 'edits'],
      properties: {
        filepath: {
          type: 'string',
          description: 'The path to the file to modify, relative to the workspace root',
          required: true
        },
        edits: {
          type: 'array',
          description: 'Array of edit operations to perform sequentially on the file',
          required: true
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  systemMessageDescription: {
    prefix: `To make multiple edits to a single file, use the ${TOOL_NAME} tool with a filepath and an array of edit operations. For example:`,
    exampleArgs: [
      ['filepath', 'src/utils/helper.ts'],
      [
        'edits',
        `[
  { "old_string": "const oldVar = 'value'", "new_string": "const newVar = 'updated'" },
  { "old_string": "oldFunction()", "new_string": "newFunction()", "replace_all": true }
]`
      ]
    ]
  },
  implementation: multiEditImpl
}
