/**
 * Docker Helper Tools
 * Manage Docker containers, images, and operations
 */

import type { Tool, ToolImpl } from '../../types/tools'

// Docker Container List
export const dockerPsImpl: ToolImpl = async (args, extras) => {
  const { all = false } = args as {
    all?: boolean
  }

  try {
    const command = all ? 'docker ps -a' : 'docker ps'
    const result = await extras.ide.terminal.exec(command)

    if (!result.success) {
      throw new Error(result.error || 'Docker command failed')
    }

    return [
      {
        name: 'Docker Containers',
        description: all ? 'All containers' : 'Running containers',
        content: `# Docker Containers\n\n**Filter**: ${all ? 'All' : 'Running only'}\n\n\`\`\`\n${result.data?.stdout || 'No containers'}\n\`\`\``
      }
    ]
  } catch (error) {
    throw new Error(`Docker ps failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const dockerPsTool: Tool = {
  type: 'function',
  category: 'custom',
  displayTitle: 'Docker List Containers',
  wouldLikeTo: 'list docker containers',
  isCurrently: 'listing docker containers',
  hasAlready: 'listed docker containers',
  readonly: true,
  isInstant: true,
  group: 'custom',
  icon: 'ContainerIcon',
  function: {
    name: 'docker_ps',
    description: 'List Docker containers (running or all).',
    parameters: {
      type: 'object',
      required: [],
      properties: {
        all: {
          type: 'boolean',
          description: 'Show all containers including stopped (default: false)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: dockerPsImpl
}

// Docker Image List
export const dockerImagesImpl: ToolImpl = async (_args, extras) => {
  try {
    const result = await extras.ide.terminal.exec('docker images')

    if (!result.success) {
      throw new Error(result.error || 'Docker command failed')
    }

    return [
      {
        name: 'Docker Images',
        description: 'Available images',
        content: `# Docker Images\n\n\`\`\`\n${result.data?.stdout || 'No images'}\n\`\`\``
      }
    ]
  } catch (error) {
    throw new Error(
      `Docker images failed: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const dockerImagesTool: Tool = {
  type: 'function',
  category: 'custom',
  displayTitle: 'Docker List Images',
  wouldLikeTo: 'list docker images',
  isCurrently: 'listing docker images',
  hasAlready: 'listed docker images',
  readonly: true,
  isInstant: true,
  group: 'custom',
  icon: 'ContainerIcon',
  function: {
    name: 'docker_images',
    description: 'List Docker images available locally.',
    parameters: {
      type: 'object',
      required: [],
      properties: {}
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: dockerImagesImpl
}

// Docker Run Container
export const dockerRunImpl: ToolImpl = async (args, extras) => {
  const {
    image,
    name,
    ports,
    env,
    volumes,
    detached = true,
    removeAfterExit = false
  } = args as {
    image: string
    name?: string
    ports?: string
    env?: string
    volumes?: string
    detached?: boolean
    removeAfterExit?: boolean
  }

  try {
    let command = 'docker run'
    if (detached) command += ' -d'
    if (removeAfterExit) command += ' --rm'
    if (name) command += ` --name ${name}`
    if (ports) command += ` -p ${ports}`
    if (env) command += ` -e ${env}`
    if (volumes) command += ` -v ${volumes}`
    command += ` ${image}`

    const result = await extras.ide.terminal.exec(command)

    if (!result.success) {
      throw new Error(result.error || 'Docker run failed')
    }

    const containerId = result.data?.stdout?.trim() || 'unknown'

    return [
      {
        name: 'Docker Container Started',
        description: `Started ${image}`,
        content: `# Docker Run\n\n**Image**: ${image}\n**Container ID**: ${containerId}\n${name ? `**Name**: ${name}\n` : ''}**Detached**: ${detached}\n\n✓ Container started successfully`
      }
    ]
  } catch (error) {
    throw new Error(`Docker run failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const dockerRunTool: Tool = {
  type: 'function',
  category: 'custom',
  displayTitle: 'Docker Run Container',
  wouldLikeTo: 'run docker container',
  isCurrently: 'running docker container',
  hasAlready: 'ran docker container',
  readonly: false,
  isInstant: false,
  group: 'custom',
  icon: 'ContainerIcon',
  function: {
    name: 'docker_run',
    description: 'Run a Docker container from an image.',
    parameters: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          description: 'Docker image name (e.g., nginx:latest)'
        },
        name: {
          type: 'string',
          description: 'Container name'
        },
        ports: {
          type: 'string',
          description: 'Port mapping (e.g., "8080:80")'
        },
        env: {
          type: 'string',
          description: 'Environment variables (e.g., "KEY=value")'
        },
        volumes: {
          type: 'string',
          description: 'Volume mapping (e.g., "/host/path:/container/path")'
        },
        detached: {
          type: 'boolean',
          description: 'Run in detached mode (default: true)'
        },
        removeAfterExit: {
          type: 'boolean',
          description: 'Remove container after exit (default: false)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: dockerRunImpl
}

// Docker Stop Container
export const dockerStopImpl: ToolImpl = async (args, extras) => {
  const { container } = args as {
    container: string
  }

  try {
    const result = await extras.ide.terminal.exec(`docker stop ${container}`)

    if (!result.success) {
      throw new Error(result.error || 'Docker stop failed')
    }

    return [
      {
        name: 'Docker Container Stopped',
        description: `Stopped ${container}`,
        content: `# Docker Stop\n\n**Container**: ${container}\n**Status**: ✓ Stopped`
      }
    ]
  } catch (error) {
    throw new Error(`Docker stop failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const dockerStopTool: Tool = {
  type: 'function',
  category: 'custom',
  displayTitle: 'Docker Stop Container',
  wouldLikeTo: 'stop docker container',
  isCurrently: 'stopping docker container',
  hasAlready: 'stopped docker container',
  readonly: false,
  isInstant: false,
  group: 'custom',
  icon: 'ContainerIcon',
  function: {
    name: 'docker_stop',
    description: 'Stop a running Docker container.',
    parameters: {
      type: 'object',
      required: ['container'],
      properties: {
        container: {
          type: 'string',
          description: 'Container ID or name'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: dockerStopImpl
}

// Docker Logs
export const dockerLogsImpl: ToolImpl = async (args, extras) => {
  const {
    container,
    tail = 100,
    follow = false
  } = args as {
    container: string
    tail?: number
    follow?: boolean
  }

  try {
    let command = `docker logs ${container} --tail ${tail}`
    if (follow) command += ' -f'

    const result = await extras.ide.terminal.exec(command)

    if (!result.success) {
      throw new Error(result.error || 'Docker logs failed')
    }

    return [
      {
        name: 'Docker Logs',
        description: `Logs from ${container}`,
        content: `# Docker Logs\n\n**Container**: ${container}\n**Lines**: ${tail}\n\n\`\`\`\n${result.data?.stdout || 'No logs'}\n\`\`\``
      }
    ]
  } catch (error) {
    throw new Error(`Docker logs failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const dockerLogsTool: Tool = {
  type: 'function',
  category: 'custom',
  displayTitle: 'Docker Logs',
  wouldLikeTo: 'view docker logs',
  isCurrently: 'viewing docker logs',
  hasAlready: 'viewed docker logs',
  readonly: true,
  isInstant: true,
  group: 'custom',
  icon: 'ContainerIcon',
  function: {
    name: 'docker_logs',
    description: 'View logs from a Docker container.',
    parameters: {
      type: 'object',
      required: ['container'],
      properties: {
        container: {
          type: 'string',
          description: 'Container ID or name'
        },
        tail: {
          type: 'number',
          description: 'Number of lines to show (default: 100)'
        },
        follow: {
          type: 'boolean',
          description: 'Follow log output (default: false)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: dockerLogsImpl
}

// Docker Exec
export const dockerExecImpl: ToolImpl = async (args, extras) => {
  const {
    container,
    command,
    interactive = false
  } = args as {
    container: string
    command: string
    interactive?: boolean
  }

  try {
    const dockerCmd = `docker exec ${interactive ? '-it' : ''} ${container} ${command}`

    const result = await extras.ide.terminal.exec(dockerCmd)

    if (!result.success) {
      throw new Error(result.error || 'Docker exec failed')
    }

    return [
      {
        name: 'Docker Exec',
        description: `Executed in ${container}`,
        content: `# Docker Exec\n\n**Container**: ${container}\n**Command**: ${command}\n\n**Output**:\n\`\`\`\n${result.data?.stdout || '(no output)'}\n\`\`\``
      }
    ]
  } catch (error) {
    throw new Error(`Docker exec failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const dockerExecTool: Tool = {
  type: 'function',
  category: 'custom',
  displayTitle: 'Docker Exec',
  wouldLikeTo: 'execute in docker container',
  isCurrently: 'executing in docker container',
  hasAlready: 'executed in docker container',
  readonly: false,
  isInstant: false,
  group: 'custom',
  icon: 'ContainerIcon',
  function: {
    name: 'docker_exec',
    description: 'Execute a command inside a running Docker container.',
    parameters: {
      type: 'object',
      required: ['container', 'command'],
      properties: {
        container: {
          type: 'string',
          description: 'Container ID or name'
        },
        command: {
          type: 'string',
          description: 'Command to execute'
        },
        interactive: {
          type: 'boolean',
          description: 'Interactive mode (default: false)'
        }
      }
    }
  },
  defaultToolPolicy: 'allowedWithPermission',
  implementation: dockerExecImpl
}
