/**
 * Single Find and Replace Tool
 * Performs exact string replacement in a file
 * Based on Continue.dev's singleFindAndReplaceTool
 */

import type { Tool, ToolImpl, ContextItem } from '../../types/tools'
import { getStringArg, getBooleanArg } from '../parseArgs'

const TOOL_NAME = 'single_find_and_replace'
const TOOL_GROUP = 'built-in'

/**
 * Validate single edit operation
 */
function validateSingleEdit(
  oldString: string,
  newString: string,
  replaceAll?: boolean
): { oldString: string; newString: string; replaceAll: boolean } {
  if (!oldString || !oldString.trim()) {
    throw new Error('old_string cannot be empty or whitespace-only')
  }

  if (!newString && newString !== '') {
    throw new Error('new_string is required (can be empty string to delete)')
  }

  if (oldString === newString) {
    throw new Error('old_string and new_string must be different')
  }

  return {
    oldString,
    newString,
    replaceAll: replaceAll ?? false
  }
}

/**
 * Execute find and replace operation
 */
function executeFindAndReplace(
  content: string,
  oldString: string,
  newString: string,
  replaceAll: boolean
): { newContent: string; occurrences: number } {
  if (!replaceAll) {
    // Single replacement - check uniqueness
    const occurrences = content.split(oldString).length - 1

    if (occurrences === 0) {
      throw new Error(
        `Could not find old_string in file. Make sure it matches exactly (including whitespace/indentation).`
      )
    }

    if (occurrences > 1) {
      throw new Error(
        `Found ${occurrences} occurrences of old_string. Either:\n` +
          `1. Provide more surrounding context to make it unique\n` +
          `2. Use replace_all: true to replace all occurrences`
      )
    }

    // Unique match - replace it
    return {
      newContent: content.replace(oldString, newString),
      occurrences: 1
    }
  } else {
    // Replace all occurrences
    const regex = new RegExp(escapeRegex(oldString), 'g')
    const occurrences = (content.match(regex) || []).length

    if (occurrences === 0) {
      throw new Error(
        `Could not find old_string in file. Make sure it matches exactly (including whitespace/indentation).`
      )
    }

    return {
      newContent: content.replace(regex, newString),
      occurrences
    }
  }
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
export const singleFindAndReplaceImpl: ToolImpl = async (args, extras) => {
  const filepath = getStringArg(args, 'filepath')
  const oldString = getStringArg(args, 'old_string')
  const newString = getStringArg(args, 'new_string', true) // Allow empty
  const replaceAll = getBooleanArg(args, 'replace_all', false) ?? false

  try {
    // Validate edit parameters
    const {
      oldString: validOld,
      newString: validNew,
      replaceAll: validReplaceAll
    } = validateSingleEdit(oldString, newString, replaceAll)

    // Read current file content
    const readResult = await extras.ide.fs.readFile(filepath)
    if (!readResult.success || !readResult.data) {
      throw new Error(readResult.error || 'Failed to read file')
    }

    const currentContent = readResult.data

    // Execute find and replace
    const { newContent, occurrences } = executeFindAndReplace(
      currentContent,
      validOld,
      validNew,
      validReplaceAll
    )

    // Write modified content back
    const writeResult = await extras.ide.fs.writeFile(filepath, newContent)
    if (!writeResult.success) {
      throw new Error(writeResult.error || 'Failed to write file')
    }

    // Calculate line changes
    const oldLines = currentContent.split('\n').length
    const newLines = newContent.split('\n').length
    const linesAdded = Math.max(0, newLines - oldLines)
    const linesRemoved = Math.max(0, oldLines - newLines)

    const contextItem: ContextItem = {
      name: filepath.split(/[\\/]/).pop() || filepath,
      description: filepath,
      content: `Successfully replaced ${occurrences} occurrence(s)`,
      status: 'Edited',
      uri: {
        type: 'file',
        value: filepath
      }
    }

    // Add metadata about changes
    const metadataItem: ContextItem = {
      name: 'Edit Summary',
      description: 'Changes made to file',
      content: `File: ${filepath}\nOccurrences replaced: ${occurrences}\nLines added: ${linesAdded}\nLines removed: ${linesRemoved}\nReplace all: ${validReplaceAll}`
    }

    return [contextItem, metadataItem]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to edit file "${filepath}": ${errorMessage}`)
  }
}

/**
 * Tool definition
 */
export const singleFindAndReplaceTool: Tool = {
  type: 'function',
  category: 'file',
  displayTitle: 'Find and Replace',
  wouldLikeTo: 'edit {{{ filepath }}}',
  isCurrently: 'editing {{{ filepath }}}',
  hasAlready: 'edited {{{ filepath }}}',
  readonly: false,
  isInstant: false,
  group: TOOL_GROUP,
  icon: 'PencilIcon',
  function: {
    name: TOOL_NAME,
    description: `Performs exact string replacements in a file.

IMPORTANT:
- ALWAYS use the read_file tool just before making edits to understand the file's up-to-date contents
- This tool CANNOT be called in parallel with other tools
- When editing, preserve exact whitespace/indentation
- Only use emojis if the user explicitly requests it
- Use replace_all for renaming variables across the file

WARNINGS:
- When NOT using replace_all, the edit will FAIL if old_string is not unique in the file
- Either provide more surrounding context to make it unique or use replace_all: true
- The edit will likely fail if you haven't recently used read_file tool`,
    parameters: {
      type: 'object',
      required: ['filepath', 'old_string', 'new_string'],
      properties: {
        filepath: {
          type: 'string',
          description: 'The path to the file to modify, relative to the workspace root',
          required: true
        },
        old_string: {
          type: 'string',
          description: 'The text to replace - must be exact including whitespace/indentation',
          required: true
        },
        new_string: {
          type: 'string',
          description: 'The text to replace it with (MUST be different from old_string)',
          required: true
        },
        replace_all: {
          type: 'boolean',
          description: 'Replace all occurrences of old_string (default: false)',
          required: false
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  systemMessageDescription: {
    prefix: `To perform exact string replacements in files, use the ${TOOL_NAME} tool with filepath and the strings to find and replace. For example:`,
    exampleArgs: [
      ['filepath', 'src/utils/helper.ts'],
      ['old_string', "const oldVariable = 'value'"],
      ['new_string', "const newVariable = 'updated'"],
      ['replace_all', 'false']
    ]
  },
  implementation: singleFindAndReplaceImpl
}
