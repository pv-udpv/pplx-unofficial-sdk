// ============================================================================
// SSE Streaming Client - Usage Examples
// ============================================================================

import { createPplxClient, Entry } from "../src/pplx-client";

// Initialize client
const client = createPplxClient({
  rateLimitConfig: {
    perMinute: 20,
    perHour: 120,
  },
});

// ===========================================================================
// EXAMPLE 1: Basic streaming search
// ===========================================================================

async function basicSearch() {
  console.log("=== Basic Search ===");
  
  try {
    for await (const entry of client.search("What is quantum computing?")) {
      console.log("Status:", entry.status);
      console.log("Blocks:", entry.blocks.length);
      
      if (entry.final) {
        console.log("Final entry:", entry.query_str);
        console.log("Sources:", entry.sources_list?.length || 0);
        break;
      }
    }
  } catch (error) {
    console.error("Search failed:", error);
  }
}

// ===========================================================================
// EXAMPLE 2: Search with focus and mode
// ===========================================================================

async function advancedSearch() {
  console.log("=== Advanced Search ===");
  
  // Academic focus
  console.log("\n1. Academic search:");
  for await (const entry of client.search("Latest AI research papers", {
    focus: "academic",
    mode: "CONCISE",
    model: "sonar",
  })) {
    if (entry.final) {
      console.log("Academic sources:", entry.sources_list?.length);
    }
  }
  
  // Writing mode
  console.log("\n2. Writing mode:");
  for await (const entry of client.search("Write an article about climate change", {
    focus: "writing",
    mode: "COPILOT",
  })) {
    if (entry.final) {
      console.log("Generated content:", entry.blocks.length, "blocks");
    }
  }
  
  // With connectors
  console.log("\n3. Search with Google Drive:");
  for await (const entry of client.search("Find ML papers", {
    sources: ["google_drive", "notion"],
    model: "experimental",
  })) {
    if (entry.final) {
      console.log("Found in connectors:", entry.sources_list?.length);
    }
  }
}

// ===========================================================================
// EXAMPLE 3: Stream reconnection
// ===========================================================================

async function reconnectionExample() {
  console.log("=== Reconnection Example ===");
  
  let lastEntry: Entry | null = null;
  let abortController = new AbortController();
  
  try {
    // Start initial search
    for await (const entry of client.search(
      "Long running query",
      { signal: abortController.signal }
    )) {
      lastEntry = entry;
      
      // Simulate network interruption after 2 seconds
      setTimeout(() => abortController.abort(), 2000);
      
      if (entry.final) break;
    }
  } catch (error: any) {
    if (error.name === "AbortError" && lastEntry?.reconnectable) {
      console.log("Connection lost, reconnecting...");
      
      // Reconnect
      for await (const entry of client.reconnect(
        lastEntry.backend_uuid,
        lastEntry.cursor!,
        abortController.signal
      )) {
        console.log("Reconnected, status:", entry.status);
        if (entry.final) break;
      }
    }
  }
}

// ===========================================================================
// EXAMPLE 4: Error handling
// ===========================================================================

async function errorHandlingExample() {
  console.log("=== Error Handling ===");
  
  try {
    // Rate limit handling
    for (let i = 0; i < 25; i++) {
      try {
        for await (const entry of client.search(`Query ${i}`)) {
          if (entry.final) break;
        }
      } catch (error: any) {
        if (error.code === "RATE_LIMIT_EXCEEDED") {
          console.log("Rate limited, waiting...");
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error("Unhandled error:", error);
  }
}

// ===========================================================================
// EXAMPLE 5: Event listeners
// ===========================================================================

async function eventListenersExample() {
  console.log("=== Event Listeners ===");
  
  // Subscribe to events
  const unsubCreated = client.on("created", ({ entry, query }) => {
    console.log("Stream created:", query);
    console.log("Entry UUID:", entry.uuid);
  });
  
  const unsubProgress = client.on("progress", ({ entry, isFirstMessage }) => {
    if (isFirstMessage) {
      console.log("First message received");
    }
    console.log("Progress:", entry.blocks.length, "blocks");
  });
  
  const unsubCompleted = client.on("completed", ({ entry }) => {
    console.log("Stream completed");
    console.log("Final blocks:", entry.blocks.length);
    console.log("Sources:", entry.sources_list?.length || 0);
  });
  
  const unsubError = client.on("error", ({ entry, error }) => {
    console.error("Stream error:", error.message);
  });
  
  const unsubAborted = client.on("aborted", ({ entry }) => {
    console.log("Stream aborted");
  });
  
  // Perform search
  try {
    for await (const entry of client.search("Test query")) {
      if (entry.final) break;
    }
  } finally {
    // Cleanup listeners
    unsubCreated();
    unsubProgress();
    unsubCompleted();
    unsubError();
    unsubAborted();
  }
}

// ===========================================================================
// EXAMPLE 6: Real-time streaming display
// ===========================================================================

async function realTimeDisplay() {
  console.log("=== Real-time Display ===");
  
  const startTime = Date.now();
  let blockCount = 0;
  
  for await (const entry of client.search("Explain machine learning")) {
    const elapsed = Date.now() - startTime;
    const newBlocks = entry.blocks.length - blockCount;
    blockCount = entry.blocks.length;
    
    console.log(`[${elapsed}ms] Status: ${entry.status}, Blocks: +${newBlocks} (total: ${blockCount})`);
    
    // Display latest block content
    if (newBlocks > 0) {
      const latestBlock = entry.blocks[entry.blocks.length - 1];
      console.log(`  Content: ${latestBlock.content.substring(0, 100)}...`);
    }
    
    if (entry.final) {
      console.log("\n=== Final Result ===");
      console.log(`Total time: ${elapsed}ms`);
      console.log(`Total blocks: ${blockCount}`);
      console.log(`Sources: ${entry.sources_list?.length || 0}`);
      
      // Display all blocks
      entry.blocks.forEach((block, idx) => {
        console.log(`\nBlock ${idx + 1} (${block.type}):`);
        console.log(block.content);
      });
      
      break;
    }
  }
}

// Run examples
(async () => {
  try {
    await basicSearch();
    // await advancedSearch();
    // await reconnectionExample();
    // await errorHandlingExample();
    // await eventListenersExample();
    // await realTimeDisplay();
  } catch (error) {
    console.error("Example failed:", error);
  }
})();
