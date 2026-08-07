// Jest needs CommonJS, while the webpack build resolves through package exports
// maps, so tests compile against tsconfig.test.json instead of the base config.
module.exports = {
    testEnvironment: "node",
    roots: ["<rootDir>/src"],
    transform: {
        "^.+\\.tsx?$": ["ts-jest", {tsconfig: "tsconfig.test.json"}]
    }
};
