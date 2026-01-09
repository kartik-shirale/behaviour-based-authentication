import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

async function initializePineconeIndexes() {
  console.log('=== Initializing Pinecone Indexes ===\n');

  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });

    const indexes = [
      { name: 'motion-embeddings', description: 'Motion pattern embeddings' },
      { name: 'gesture-embeddings', description: 'Gesture pattern embeddings' },
      { name: 'typing-embeddings', description: 'Typing pattern embeddings' }
    ];

    console.log('Environment check:');
    console.log('PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? '✅ Set' : '❌ Not set');
    console.log('ENCODING_API_URL:', process.env.ENCODING_API_URL || 'Not set');
    console.log('');

    for (const indexInfo of indexes) {
      const indexName = indexInfo.name;
      console.log(`Processing ${indexName}...`);

      try {
        // Check if index exists
        const existingIndex = await pinecone.describeIndex(indexName);
        console.log(`✅ ${indexName} already exists`);
        console.log(`   Status: ${existingIndex.status?.ready ? 'Ready' : 'Not Ready'}`);
        console.log(`   Dimension: ${existingIndex.dimension}`);
        console.log(`   Metric: ${existingIndex.metric}`);

      } catch (error) {
        if (error.status === 404 || error.message.includes('404')) {
          console.log(`📝 Creating ${indexName}...`);

          try {
            await pinecone.createIndex({
              name: indexName,
              dimension: 256, // Adjust based on your encoding API output
              metric: 'cosine',
              spec: {
                serverless: {
                  cloud: 'aws',
                  region: 'us-east-1'
                }
              }
            });

            console.log(`✅ ${indexName} created successfully`);

            // Wait a moment for the index to be ready
            console.log(`   Waiting for ${indexName} to be ready...`);
            let ready = false;
            let attempts = 0;
            const maxAttempts = 30;

            while (!ready && attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 2000));
              try {
                const status = await pinecone.describeIndex(indexName);
                ready = status.status?.ready || false;
                attempts++;
                if (!ready) {
                  console.log(`   Still initializing... (${attempts}/${maxAttempts})`);
                }
              } catch (e) {
                attempts++;
                console.log(`   Checking status... (${attempts}/${maxAttempts})`);
              }
            }

            if (ready) {
              console.log(`✅ ${indexName} is ready for use`);
            } else {
              console.log(`⚠️  ${indexName} created but may still be initializing`);
            }

          } catch (createError) {
            console.error(`❌ Failed to create ${indexName}:`, createError.message);
          }

        } else {
          console.error(`❌ Error checking ${indexName}:`, error.message);
        }
      }

      console.log('');
    }

    // Final verification
    console.log('=== Final Verification ===');
    const indexList = await pinecone.listIndexes();
    console.log('All indexes in Pinecone:');

    if (indexList.indexes && indexList.indexes.length > 0) {
      indexList.indexes.forEach((index, i) => {
        console.log(`  ${i + 1}. ${index.name} (${index.status})`);
      });
    } else {
      console.log('  No indexes found');
    }

  } catch (error) {
    console.error('❌ Failed to initialize Pinecone indexes:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the initialization
initializePineconeIndexes().then(() => {
  console.log('\n=== Initialization completed ===');
  process.exit(0);
}).catch(error => {
  console.error('Initialization failed with error:', error);
  process.exit(1);
});