import { defineConfig } from 'vitest/config'
import dotenv from 'dotenv'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['json-summary', 'text', 'lcov'],
      include: ['src']
    },
    env: dotenv.config({ path: '.env.local' }).parsed
  }
})
