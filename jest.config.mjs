import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

// antd and its helper packages publish ESM-only builds, which Jest must transform like source files.
const ESM_PACKAGES = ['@ant-design', 'antd', 'antd-style', '@rc-component', 'rc-[a-z-]+', '@babel/runtime']

/** @type {import('jest').Config} */
const config = {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
}

const jestConfig = async () => ({
    ...(await createJestConfig(config)()),
    transformIgnorePatterns: [`/node_modules/(?!(${ESM_PACKAGES.join('|')})/)`],
})

export default jestConfig
