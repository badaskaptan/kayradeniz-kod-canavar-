/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * 🌙 Night Orders Command - Manual Test
 * Phase 2.3: Test task execution engine
 */

import { NightOrdersCommand } from './night-orders-command'
import { ShipsLogbook } from '../shared/ships-logbook'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * Test Night Orders Command execution flow
 */
async function testNightOrders(): Promise<void> {
  console.log('🌙 ========================================')
  console.log('🌙 Night Orders Command - Test Suite')
  console.log('🌙 ========================================\n')

  // Initialize
  const testDataDir = join(tmpdir(), 'luma-test-night-orders')
  const logbook = new ShipsLogbook(testDataDir)
  const nightOrders = new NightOrdersCommand(logbook, {
    maxRetries: 3,
    autoEscalate: true,
    contextWindowSize: 5,
    enableReflexion: true
  })

  console.log('✅ Initialized Night Orders Command\n')

  // Test 1: Parse natural language order
  console.log('📝 TEST 1: Parse Natural Language Order')
  console.log('   Input: "Add dark mode to settings"')

  const order = await nightOrders.issueOrdersFromNaturalLanguage('Add dark mode to settings')

  console.log('   ✓ Order created:')
  console.log(`     - Mission: ${order.missionTitle}`)
  console.log(`     - Objectives: ${order.objectives.length}`)
  console.log(`     - Tasks: ${order.taskBreakdown.length}`)
  console.log('   ✓ Tasks breakdown:')
  order.taskBreakdown.forEach((task) => {
    console.log(`     ${task.taskId}. ${task.description} [${task.assignedTo}]`)
  })
  console.log()

  // Test 2: Execute first task
  console.log('⚙️  TEST 2: Execute First Task')
  const result1 = await nightOrders.executeNextTask()

  if (result1.success) {
    console.log('   ✓ Task executed successfully')
    console.log(`     - Task: ${result1.task?.description}`)
    console.log(`     - Status: ${result1.task?.status}`)
    console.log(`     - Progress: ${result1.context?.missionProgress}%`)
  } else {
    console.log('   ✗ Task execution failed:', result1.error)
  }
  console.log()

  // Test 3: Execute second task
  console.log('⚙️  TEST 3: Execute Second Task')
  const result2 = await nightOrders.executeNextTask()

  if (result2.success) {
    console.log('   ✓ Task executed successfully')
    console.log(`     - Task: ${result2.task?.description}`)
    console.log(`     - Status: ${result2.task?.status}`)
    console.log(`     - Progress: ${result2.context?.missionProgress}%`)
  } else {
    console.log('   ✗ Task execution failed:', result2.error)
  }
  console.log()

  // Test 4: Get mission statistics
  console.log('📊 TEST 4: Mission Statistics')
  const stats = nightOrders.getStatistics()

  if (stats) {
    console.log('   ✓ Statistics:')
    console.log(`     - Total tasks: ${stats.totalTasks}`)
    console.log(`     - Completed: ${stats.completedTasks}`)
    console.log(`     - Failed: ${stats.failedTasks}`)
    console.log(`     - Success rate: ${(stats.successRate * 100).toFixed(1)}%`)
    console.log(`     - Total duration: ${(stats.totalDuration / 1000).toFixed(2)}s`)
  }
  console.log()

  // Test 5: Execute remaining tasks
  console.log('⚙️  TEST 5: Execute Remaining Tasks')
  let taskCount = 2 // Already executed 2
  const maxTasks = order.taskBreakdown.length

  while (taskCount < maxTasks) {
    const result = await nightOrders.executeNextTask()

    if (!result.success) {
      console.log(`   ✗ Task ${taskCount + 1} failed:`, result.error)
      break
    }

    console.log(`   ✓ Task ${taskCount + 1}/${maxTasks} completed`)
    taskCount++
  }
  console.log()

  // Test 6: Complete mission
  console.log('✅ TEST 6: Complete Mission')
  nightOrders.completeOrder(true)

  const finalStats = nightOrders.getStatistics()
  if (finalStats) {
    console.log('   ✓ Mission completed:')
    console.log(`     - Completed: ${finalStats.completedTasks}/${finalStats.totalTasks}`)
    console.log(`     - Success rate: ${(finalStats.successRate * 100).toFixed(1)}%`)
    console.log(`     - Total time: ${(finalStats.totalDuration / 1000).toFixed(2)}s`)
  }

  console.log('\n🌙 ========================================')
  console.log('🌙 All Tests Completed!')
  console.log('🌙 ========================================\n')

  // Close logbook
  logbook.close()
}

// Run tests if executed directly
if (require.main === module) {
  testNightOrders()
    .then(() => {
      console.log('✅ Test suite completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Test suite failed:', error)
      process.exit(1)
    })
}

export { testNightOrders }
