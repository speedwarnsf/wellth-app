#!/bin/bash

echo "Fixing duplicate import in firestore.ts..."

# Fix line 1: Add runTransaction and increment
sed -i '' '1s/import { collection, doc, writeBatch }/import { collection, doc, writeBatch, runTransaction, increment }/' ./src/api/firestore.ts

# Delete line 23 (the duplicate import)
sed -i '' '23d' ./src/api/firestore.ts

echo "✅ Fixed! Reload your app."
