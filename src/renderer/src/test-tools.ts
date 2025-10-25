/**
 * Phase 2 Tools Manual Test Script
 * Run with: npm run test:tools
 */

import { ToolRegistry } from './tools/registry'
import { BASE_TOOLS } from './tools/implementations'
import type { ToolExtras } from './types/tools'

console.log('🧪 Starting Phase 2 Tools Test...\n')

// Create registry and register all tools
const registry = new ToolRegistry()
registry.registerAll(BASE_TOOLS)

console.log('📊 Registry Stats:', registry.getStats())
console.log('')

// Mock ToolExtras for testing
const mockExtras: ToolExtras = {
  ide: {
    fs: {
      readFile: async (path: string) => ({
        success: true,
        data: `Line 1: First line of ${path}
Line 2: Second line
Line 3: Third line
Line 4: Fourth line
Line 5: Fifth line
Line 6: Sixth line
Line 7: Seventh line
Line 8: Eighth line
Line 9: Ninth line
Line 10: Tenth line`
      }),
      writeFile: async () => ({ success: true }),
      deleteFile: async () => ({ success: true }),
      createDirectory: async () => ({ success: true }),
      readDirectory: async (path: string) => ({
        success: true,
        data: [
          {
            name: 'components',
            path: `${path}/components`,
            type: 'directory' as const,
            size: 0,
            modified: new Date().toISOString()
          },
          {
            name: 'utils',
            path: `${path}/utils`,
            type: 'directory' as const,
            size: 0,
            modified: new Date().toISOString()
          },
          {
            name: 'index.ts',
            path: `${path}/index.ts`,
            type: 'file' as const,
            size: 2048,
            modified: new Date().toISOString()
          },
          {
            name: 'App.tsx',
            path: `${path}/App.tsx`,
            type: 'file' as const,
            size: 4096,
            modified: new Date().toISOString()
          }
        ]
      }),
      getStats: async () => ({
        success: true,
        data: {
          size: 1024,
          modified: new Date().toISOString(),
          created: new Date().toISOString(),
          isDirectory: false,
          isFile: true
        }
      }),
      exists: async () => ({ success: true, data: true })
    },
    terminal: {
      exec: async (command: string) => ({
        success: true,
        data: {
          stdout: `✓ Executed: ${command}\nNode.js v20.11.0\nnpm v10.5.0`,
          stderr: '',
          exitCode: 0,
          executionTime: 125
        }
      }),
      getCwd: async () => ({ success: true, data: '/workspace' }),
      setCwd: async () => ({ success: true }),
      getEnv: async () => ({ success: true, data: {} }),
      setEnv: async () => ({ success: true })
    },
    search: {
      grep: async () => ({ success: true, data: [] }),
      glob: async () => ({ success: true, data: [] })
    },
    git: {
      status: async () => ({
        success: true,
        data: {
          branch: 'main',
          ahead: 0,
          behind: 0,
          staged: ['src/index.ts'],
          modified: ['src/App.tsx'],
          untracked: ['src/components/NewComponent.tsx']
        }
      }),
      diff: async () => ({
        success: true,
        data: `diff --git a/src/App.tsx b/src/App.tsx
--- a/src/App.tsx
+++ b/src/App.tsx
@@
-console.log('old')
+console.log('new')`
      }),
      log: async () => ({
        success: true,
        data: `commit 1234567
Author: Test User
Date:   Today

    chore: mock git log`
      }),
      add: async () => ({ success: true, data: 'Added files to staging area.' }),
      commit: async (options) => ({
        success: true,
        data: `Committed with message: ${options.message}`
      })
    },
    dialog: {
      openFile: async () => ({ success: true, data: null }),
      openDirectory: async () => ({ success: true, data: null }),
      saveFile: async () => ({ success: true, data: null })
    }
  }
}

// Test 1: readFileRange
async function testReadFileRange(): Promise<void> {
  console.log('📖 Test 1: readFileRange Tool')
  console.log('─'.repeat(50))

  const tool = registry.get('read_file_range')
  if (!tool) {
    console.error('❌ Tool not found!')
    return
  }

  try {
    // Test reading lines 3-5
    console.log('Testing: Read lines 3-5 from test.txt')
    const result = await tool.implementation(
      {
        filepath: 'test.txt',
        start_line: 3,
        end_line: 5
      },
      mockExtras
    )

    console.log('✅ Success!')
    console.log('Context Items:', result.length)
    console.log('Content preview:', result[0].content.substring(0, 100) + '...')
    console.log('')

    // Test single line
    console.log('Testing: Read single line 7')
    const result2 = await tool.implementation(
      {
        filepath: 'test.txt',
        start_line: 7,
        end_line: 7
      },
      mockExtras
    )

    console.log('✅ Success!')
    console.log('Content:', result2[0].content)
    console.log('')

    // Test error: invalid range
    console.log('Testing: Invalid range (start > end)')
    try {
      await tool.implementation(
        {
          filepath: 'test.txt',
          start_line: 5,
          end_line: 2
        },
        mockExtras
      )
      console.log('❌ Should have thrown error!')
    } catch (error) {
      console.log('✅ Correctly threw error:', (error as Error).message)
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
  }

  console.log('')
}

// Test 2: runTerminalCommand
async function testRunTerminalCommand(): Promise<void> {
  console.log('💻 Test 2: runTerminalCommand Tool')
  console.log('─'.repeat(50))

  const tool = registry.get('run_terminal_command')
  if (!tool) {
    console.error('❌ Tool not found!')
    return
  }

  try {
    console.log('Testing: Run "node --version"')
    const result = await tool.implementation(
      {
        command: 'node --version'
      },
      mockExtras
    )

    console.log('✅ Success!')
    console.log('Context Items:', result.length)
    console.log('Terminal output:')
    console.log(result[0].content)
    console.log('')

    // Test error: missing command
    console.log('Testing: Missing command argument')
    try {
      await tool.implementation({}, mockExtras)
      console.log('❌ Should have thrown error!')
    } catch (error) {
      console.log('✅ Correctly threw error:', (error as Error).message)
    }
  } catch (error) {
    console.error('❌ Test failed:', error)
  }

  console.log('')
}

// Test 3: lsTool
async function testLsTool(): Promise<void> {
  console.log('📁 Test 3: lsTool (Directory Listing)')
  console.log('─'.repeat(50))

  const tool = registry.get('ls_directory')
  if (!tool) {
    console.error('❌ Tool not found!')
    return
  }

  try {
    console.log('Testing: List "src" directory')
    const result = await tool.implementation(
      {
        dirPath: 'src'
      },
      mockExtras
    )

    console.log('✅ Success!')
    console.log('Context Items:', result.length)
    console.log('Directory listing:')
    console.log(result[0].content)
    console.log('')

    // Test root directory
    console.log('Testing: List root directory (".")')
    const result2 = await tool.implementation(
      {
        dirPath: '.'
      },
      mockExtras
    )

    console.log('✅ Success!')
    console.log('Directory listing:')
    console.log(result2[0].content)
  } catch (error) {
    console.error('❌ Test failed:', error)
  }

  console.log('')
}

// Run all tests
async function runAllTests(): Promise<void> {
  console.log('═'.repeat(50))
  console.log('  PHASE 2 TOOLS TEST SUITE')
  console.log('═'.repeat(50))
  console.log('')

  await testReadFileRange()
  await testRunTerminalCommand()
  await testLsTool()

  console.log('═'.repeat(50))
  console.log('✅ All tests completed!')
  console.log('═'.repeat(50))
}

// Run tests
runAllTests().catch(console.error)
