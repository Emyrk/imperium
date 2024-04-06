// Verify the test environment has some guarantees for the global state in place
test("Test Environment is set up correctly", () => {
  // @ts-ignore
  expect(global.Memory).toBeUndefined();
});
