/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["./jest.setup.js"],
  globals: {
    "ts-jest": {
      tsconfig: {
        types: ["jest", "chrome"],
      },
    },
  },
};

module.exports = config;