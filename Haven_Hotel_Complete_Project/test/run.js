const { spawn } = require("child_process");
const path = require("path");
const { runTests } = require("./backend.test");

async function main() {
  process.env.PORT = "3001";

  const serverProcess = spawn(
    process.execPath,
    [path.join(__dirname, "..", "server.js")],
    {
      env: { ...process.env, PORT: "3001" },
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  serverProcess.stdout.on("data", (data) => {
    // process.stdout.write(`[SERVER] ${data}`);
  });

  serverProcess.stderr.on("data", (data) => {
    process.stderr.write(`[SERVER ERR] ${data}`);
  });

  // Wait for server to boot up
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    await runTests();
  } finally {
    serverProcess.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
