// ============================================================================
// Usage Examples - REST API Client
// ============================================================================

import { createRestClient } from "../src/pplx-rest-client";

// Initialize REST client
const restClient = createRestClient();

// ===========================================================================
// EXAMPLE 1: Thread and Entry Management
// ===========================================================================

export async function threadAndEntryExample() {
  // 1. Create a new thread
  const thread = await restClient.createThread({
    title: "Machine Learning Discussion",
    privacy_state: "private",
  });
  console.log("Created thread:", thread.uuid);

  // 2. List all entries in thread (initially empty)
  const entries = await restClient.listThreadEntries(thread.uuid);
  console.log("Total entries:", entries.length);

  // NOTE: To add entries to a thread, use the SSE streaming client
  // which will be implemented in Issue #1. Once entries exist, you can:
  
  // 3. Get specific entry details
  // const entry = await restClient.getEntry(entryUuid);
  // console.log("Entry details:", entry.query_str);

  // 4. Like the entry
  // const social = await restClient.likeEntry(entryUuid);
  // console.log("Likes:", social.like_count);

  // 5. Get related queries
  // const related = await restClient.getRelatedQueries(entryUuid);
  // console.log("Related queries:", related);
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
  void await restClient.createThread({
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
// EXAMPLE 3: Fork entry
// ===========================================================================

export async function forkExample() {
  // Get existing entry (requires a valid backend_uuid from a real entry)
  // const entry = await restClient.getEntry("some-backend-uuid");

  // Fork to new thread
  // const forkResult = await restClient.forkEntry({
  //   backend_uuid: entry.backend_uuid,
  //   title: "Forked Discussion",
  // });

  // console.log("New thread:", forkResult.new_context_uuid);
  // console.log("New entry:", forkResult.new_backend_uuid);

  // NOTE: To continue the conversation in the forked thread,
  // use the SSE client (to be implemented in Issue #1)
  
  console.log("Fork example requires existing entries. See comments for usage.");
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

export async function threadManagementExample() {
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

  // Update first entry (if exists)
  if (entries[0]) {
    await restClient.updateEntry({
      backend_uuid: entries[0].backend_uuid,
      query_str: "Updated query",
    });
  }

  // Delete thread (commented out for safety)
  // await restClient.deleteThread(thread.uuid);
}

// Run examples (modify as needed)
(async () => {
  try {
    // Uncomment the example you want to run:
    // await threadAndEntryExample();
    // await collectionsExample();
    // await forkExample();
    // await paginationExample();
    // await threadManagementExample();
    
    console.log("Examples are ready to run. Uncomment the function calls above.");
  } catch (error) {
    console.error("Error:", error);
  }
})();