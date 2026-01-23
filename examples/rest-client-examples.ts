// ============================================================================
// Usage Examples - REST API Client
// ============================================================================

import { createRestClient } from "../src/pplx-rest-client";
import { createPplxClient } from "../src/pplx-client";

// Initialize clients
const restClient = createRestClient();
const sseClient = createPplxClient();

// ===========================================================================
// EXAMPLE 1: Full conversation flow
// ===========================================================================

async function fullConversationFlow() {
  // 1. Create a new thread
  const thread = await restClient.createThread({
    title: "Machine Learning Discussion",
    privacy_state: "private",
  });
  console.log("Created thread:", thread.uuid);

  // 2. Start SSE search and get first entry
  let firstEntryUuid: string | undefined;
  for await (const entry of sseClient.search("Explain transformers in ML")) {
    console.log("Streaming:", entry.status);
    if (entry.backend_uuid) {
      firstEntryUuid = entry.backend_uuid;
    }
    if (entry.final) break;
  }

  // 3. Get full entry details
  if (firstEntryUuid) {
    const entry = await restClient.getEntry(firstEntryUuid);
    console.log("Entry details:", entry.query_str);

    // 4. Like the entry
    const social = await restClient.likeEntry(firstEntryUuid);
    console.log("Likes:", social.like_count);

    // 5. Get related queries
    const related = await restClient.getRelatedQueries(firstEntryUuid);
    console.log("Related queries:", related);
  }

  // 6. List all entries in thread
  const entries = await restClient.listThreadEntries(thread.uuid);
  console.log("Total entries:", entries.length);
}

// ===========================================================================
// EXAMPLE 2: Collections (Spaces)
// ===========================================================================

export async function collectionsExample() {
  // Create collection
  const collection = await restClient.createCollection({
    name: "ML Research",
    description: "Machine learning papers and discussions",
    is_public: false,
  });

  // Create threads and add to collection
  await restClient.createThread({
    title: "Attention mechanisms",
    collection_uuid: collection.uuid,
  });

  const thread2 = await restClient.createThread({
    title: "Vision transformers",
  });

  // Add existing thread to collection
  await restClient.addThreadToCollection(collection.uuid, thread2.uuid);

  // List collection threads
  const fullCollection = await restClient.getCollection(collection.uuid);
  console.log("Threads in collection:", fullCollection.threads.length);
}

// ===========================================================================
// EXAMPLE 3: Fork and modify
// ===========================================================================

export async function forkExample() {
  // Get existing entry
  const entry = await restClient.getEntry("some-backend-uuid");

  // Fork to new thread
  const forkResult = await restClient.forkEntry({
    backend_uuid: entry.backend_uuid,
    title: "Forked Discussion",
  });

  console.log("New thread:", forkResult.new_context_uuid);
  console.log("New entry:", forkResult.new_backend_uuid);

  // Continue conversation in forked thread with SSE
  for await (const newEntry of sseClient.search("Follow-up question", {
    context_uuid: forkResult.new_context_uuid,
  })) {
    console.log("New response:", newEntry.blocks);
    if (newEntry.final) break;
  }
}

// ===========================================================================
// EXAMPLE 4: Pagination
// ===========================================================================

export async function paginationExample() {
  let cursor: string | undefined;
  let allThreads: any[] = [];

  do {
    const page = await restClient.listThreads({
      limit: 20,
      cursor,
      sort: "updated_at",
      order: "desc",
    });

    allThreads = allThreads.concat(page.items);
    cursor = page.next_cursor;

    console.log(`Fetched ${page.items.length} threads`);
  } while (cursor);

  console.log(`Total threads: ${allThreads.length}`);
}

// ===========================================================================
// EXAMPLE 5: Thread management
// ===========================================================================

export async function threadManagement() {
  // Get thread by slug (from URL)
  const thread = await restClient.getThreadBySlug("machine-learning-basics");

  // Update thread
  await restClient.updateThread({
    uuid: thread.uuid,
    title: "ML Basics - Updated",
    privacy_state: "public",
  });

  // Get entries
  const entries = await restClient.listThreadEntries(thread.uuid);

  // Update first entry
  if (entries[0]) {
    await restClient.updateEntry({
      backend_uuid: entries[0].backend_uuid,
      query_str: "Updated query",
    });
  }

  // Delete thread
  // await restClient.deleteThread(thread.uuid);
}

// Run examples
(async () => {
  try {
    await fullConversationFlow();
    // await collectionsExample();
    // await forkExample();
    // await paginationExample();
    // await threadManagement();
  } catch (error) {
    console.error("Error:", error);
  }
})();