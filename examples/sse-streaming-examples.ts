// ============================================================================
// SSE Streaming Client - Usage Examples
// ============================================================================

import { createPplxClient, createRestClient, Entry } from "../src/index";

// Initialize clients
const sseClient = createPplxClient();
const restClient = createRestClient();

// ===========================================================================
// EXAMPLE 1: Basic Streaming Search
// ===========================================================================

export async function basicStreamingSearch() {
  console.log("\n=== Basic Streaming Search ===\n");

  const query = "What is quantum computing?";
  console.log(`Query: ${query}\n`);

  for await (const entry of sseClient.search(query)) {
    console.log(`Status: ${entry.status}`);
    
    if (entry.blocks?.length > 0) {
      console.log(`Content: ${JSON.stringify(entry.blocks).slice(0, 100)}...`);
    }
    
    if (entry.sources_list?.length > 0) {
      console.log(`Sources: ${entry.sources_list.length}`);
    }

    if (entry.final) {
      console.log("\n✓ Search complete!");
      console.log(`Backend UUID: ${entry.backend_uuid}`);
      console.log(`Context UUID: ${entry.context_uuid}`);
      break;
    }
  }
}

// ===========================================================================
// EXAMPLE 2: Multi-Turn Conversation
// ===========================================================================

export async function multiTurnConversation() {
  console.log("\n=== Multi-Turn Conversation ===\n");

  // First question
  let contextUuid: string | undefined;
  let firstEntryUuid: string | undefined;

  console.log("Question 1: What are neural networks?");
  for await (const entry of sseClient.search("What are neural networks?")) {
    if (entry.context_uuid) contextUuid = entry.context_uuid;
    if (entry.backend_uuid) firstEntryUuid = entry.backend_uuid;
    if (entry.final) {
      console.log("Answer received:", entry.blocks?.[0] || "...");
      break;
    }
  }

  // Follow-up questions in same context
  const followUps = [
    "How do they learn?",
    "What are common architectures?",
    "What are they used for?",
  ];

  for (const question of followUps) {
    console.log(`\nQuestion: ${question}`);
    for await (const entry of sseClient.search(question, {
      context_uuid: contextUuid,
    })) {
      if (entry.final) {
        console.log("Answer received:", entry.blocks?.[0] || "...");
        break;
      }
    }
  }

  console.log("\n✓ Conversation complete!");
  console.log(`Thread UUID: ${contextUuid}`);
}

// ===========================================================================
// EXAMPLE 3: Search with Different Focuses
// ===========================================================================

export async function searchWithFocuses() {
  console.log("\n=== Search with Different Focuses ===\n");

  const query = "machine learning";

  // Scholar focus for academic papers
  console.log("1. Scholar focus (academic papers):");
  for await (const entry of sseClient.search(query, { focus: "scholar" })) {
    if (entry.final) {
      console.log("Sources:", entry.sources_list?.slice(0, 3));
      break;
    }
  }

  // YouTube focus for videos
  console.log("\n2. YouTube focus (videos):");
  for await (const entry of sseClient.search(query, { focus: "youtube" })) {
    if (entry.final) {
      console.log("Sources:", entry.sources_list?.slice(0, 3));
      break;
    }
  }

  // Reddit focus for discussions
  console.log("\n3. Reddit focus (discussions):");
  for await (const entry of sseClient.search(query, { focus: "reddit" })) {
    if (entry.final) {
      console.log("Sources:", entry.sources_list?.slice(0, 3));
      break;
    }
  }

  console.log("\n✓ All searches complete!");
}

// ===========================================================================
// EXAMPLE 4: Complete Workflow with REST API Integration
// ===========================================================================

export async function completeWorkflow() {
  console.log("\n=== Complete Workflow (SSE + REST) ===\n");

  // Step 1: Create a thread
  const thread = await restClient.createThread({
    title: "AI Research Thread",
    privacy_state: "private",
  });
  console.log(`1. Created thread: ${thread.uuid}`);

  // Step 2: Stream search
  let entryUuid: string | undefined;
  console.log("\n2. Streaming search...");
  for await (const entry of sseClient.search("Explain transformers in AI")) {
    if (entry.backend_uuid) entryUuid = entry.backend_uuid;
    if (entry.final) {
      console.log("   ✓ Search complete");
      break;
    }
  }

  // Step 3: Get full entry details via REST
  if (entryUuid) {
    console.log("\n3. Getting entry details via REST...");
    const entry = await restClient.getEntry(entryUuid);
    console.log(`   Entry: ${entry.query_str}`);

    // Step 4: Like the entry
    console.log("\n4. Liking entry...");
    const social = await restClient.likeEntry(entryUuid);
    console.log(`   Likes: ${social.like_count}`);

    // Step 5: Get related queries
    console.log("\n5. Getting related queries...");
    const related = await restClient.getRelatedQueries(entryUuid);
    console.log(`   Related queries: ${related.length}`);

    // Step 6: Fork to new thread
    console.log("\n6. Forking to new thread...");
    const fork = await restClient.forkEntry({
      backend_uuid: entryUuid,
      title: "Deep Dive: Transformers",
    });
    console.log(`   New thread: ${fork.new_context_uuid}`);

    // Step 7: Continue in forked thread
    console.log("\n7. Continuing in forked thread...");
    for await (const entry of sseClient.search("Tell me more about attention mechanisms", {
      context_uuid: fork.new_context_uuid,
    })) {
      if (entry.final) {
        console.log("   ✓ Follow-up complete");
        break;
      }
    }
  }

  console.log("\n✓ Workflow complete!");
}

// ===========================================================================
// EXAMPLE 5: Progress Tracking
// ===========================================================================

export async function progressTracking() {
  console.log("\n=== Progress Tracking ===\n");

  const query = "Write a comprehensive guide on deep learning";
  console.log(`Query: ${query}\n`);

  const entries: Entry[] = [];
  let progress = 0;

  for await (const entry of sseClient.search(query, { mode: "detailed" })) {
    entries.push(entry);

    // Update progress
    progress = entry.final ? 100 : Math.min(progress + 10, 90);
    console.log(`Progress: ${progress}% | Blocks: ${entry.blocks?.length || 0}`);

    // Show partial content
    if (entry.blocks?.length > 0 && !entry.final) {
      console.log(`Partial: ${JSON.stringify(entry.blocks[0]).slice(0, 80)}...`);
    }

    if (entry.final) {
      console.log("\n✓ Complete!");
      console.log(`Total entries: ${entries.length}`);
      console.log(`Total blocks: ${entry.blocks?.length || 0}`);
      console.log(`Sources: ${entry.sources_list?.length || 0}`);
      break;
    }
  }
}

// ===========================================================================
// EXAMPLE 6: Error Handling and Retry
// ===========================================================================

export async function errorHandlingAndRetry() {
  console.log("\n=== Error Handling and Retry ===\n");

  const maxRetries = 3;
  const query = "Complex research query";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}...`);

      const entries: Entry[] = [];
      for await (const entry of sseClient.search(query)) {
        entries.push(entry);
        if (entry.final) break;
      }

      console.log(`✓ Success! Received ${entries.length} entries`);
      return entries;
    } catch (error: any) {
      console.error(`✗ Attempt ${attempt} failed: ${error.message}`);

      if (attempt === maxRetries) {
        console.error("Max retries reached. Giving up.");
        throw error;
      }

      // Exponential backoff
      const delay = 1000 * Math.pow(2, attempt - 1);
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// ===========================================================================
// EXAMPLE 7: Different Search Modes
// ===========================================================================

export async function differentSearchModes() {
  console.log("\n=== Different Search Modes ===\n");

  const query = "artificial intelligence";

  // Concise mode
  console.log("1. Concise mode (brief answer):");
  for await (const entry of sseClient.search(query, { mode: "concise" })) {
    if (entry.final) {
      console.log(`   Blocks: ${entry.blocks?.length || 0}`);
      break;
    }
  }

  // Detailed mode
  console.log("\n2. Detailed mode (comprehensive answer):");
  for await (const entry of sseClient.search(query, { mode: "detailed" })) {
    if (entry.final) {
      console.log(`   Blocks: ${entry.blocks?.length || 0}`);
      break;
    }
  }

  // Auto mode (default)
  console.log("\n3. Auto mode (adaptive):");
  for await (const entry of sseClient.search(query)) {
    if (entry.final) {
      console.log(`   Blocks: ${entry.blocks?.length || 0}`);
      break;
    }
  }

  console.log("\n✓ All modes tested!");
}

// ===========================================================================
// EXAMPLE 8: Collecting All Entries
// ===========================================================================

export async function collectingAllEntries() {
  console.log("\n=== Collecting All Entries ===\n");

  const query = "What is blockchain?";
  const allEntries: Entry[] = [];

  console.log(`Streaming: ${query}\n`);

  for await (const entry of sseClient.search(query)) {
    allEntries.push(entry);
    console.log(`Entry ${allEntries.length}: ${entry.status}`);

    if (entry.final) break;
  }

  console.log(`\n✓ Collected ${allEntries.length} entries`);

  // Analyze entries
  const final = allEntries[allEntries.length - 1];
  console.log("\nFinal entry:");
  console.log(`  Backend UUID: ${final.backend_uuid}`);
  console.log(`  Context UUID: ${final.context_uuid}`);
  console.log(`  Blocks: ${final.blocks?.length || 0}`);
  console.log(`  Sources: ${final.sources_list?.length || 0}`);
}

// ===========================================================================
// EXAMPLE 9: Custom Configuration
// ===========================================================================

export async function customConfiguration() {
  console.log("\n=== Custom Configuration ===\n");

  // Create client with custom config
  const customClient = createPplxClient({
    baseUrl: "https://www.perplexity.ai",
    timeout: 120000, // 2 minutes
    headers: {
      "User-Agent": "CustomApp/1.0",
    },
    logger: {
      debug: (...args) => console.log("[DEBUG]", ...args),
      info: (...args) => console.log("[INFO]", ...args),
      warn: (...args) => console.warn("[WARN]", ...args),
      error: (...args) => console.error("[ERROR]", ...args),
    },
  });

  console.log("Using custom client configuration");
  console.log("Timeout: 120000ms");
  console.log("Custom headers: Yes");
  console.log("Custom logger: Yes\n");

  for await (const entry of customClient.search("test query")) {
    if (entry.final) {
      console.log("\n✓ Search complete with custom config");
      break;
    }
  }
}

// ===========================================================================
// EXAMPLE 10: Unified SDK Helper Methods
// ===========================================================================

export async function unifiedSDKHelpers() {
  console.log("\n=== Unified SDK Helper Methods ===\n");

  const { createPplxSDK } = require("../src/index");
  const sdk = createPplxSDK();

  // Quick search helper
  console.log("1. Quick search (SSE + REST combined):");
  const result = await sdk.quickSearch("quantum mechanics");
  console.log(`   Entries: ${result.entries.length}`);
  console.log(`   Thread: ${result.thread?.uuid || "N/A"}`);

  // Search with connectors helper
  console.log("\n2. Search with connectors:");
  for await (const entry of sdk.searchWithConnectors(
    "latest research",
    ["connector-1", "connector-2"]
  )) {
    if (entry.final) {
      console.log("   ✓ Search complete");
      break;
    }
  }

  console.log("\n✓ Helper methods tested!");
}

// ===========================================================================
// Main execution
// ===========================================================================

async function runExamples() {
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  SSE Streaming Client - Usage Examples               ║");
  console.log("╚════════════════════════════════════════════════════════╝");

  try {
    // Note: These examples require valid authentication
    // Uncomment the ones you want to run

    await basicStreamingSearch();
    // await multiTurnConversation();
    // await searchWithFocuses();
    // await completeWorkflow();
    // await progressTracking();
    // await errorHandlingAndRetry();
    // await differentSearchModes();
    // await collectingAllEntries();
    // await customConfiguration();
    // await unifiedSDKHelpers();

    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║  All examples completed successfully!                 ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
  } catch (error: any) {
    console.error("\n╔════════════════════════════════════════════════════════╗");
    console.error("║  Error occurred:                                      ║");
    console.error("╚════════════════════════════════════════════════════════╝");
    console.error(error.message);
    console.error("\nNote: These examples require valid authentication.");
    console.error("Please ensure you have proper credentials configured.");
  }
}

// Run if executed directly
if (require.main === module) {
  runExamples();
}

export default runExamples;
