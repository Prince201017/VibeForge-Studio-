#!/bin/bash

echo "Removing duplicate files..."

# Remove all files with (1), (2), (3), etc in name
find . -type f -name "*\(1\)*" -delete
find . -type f -name "*\(2\)*" -delete
find . -type f -name "*\(3\)*" -delete
find . -type f -name "*\(4\)*" -delete
find . -type f -name "*\(5\)*" -delete
find . -type f -name "*\(6\)*" -delete
find . -type f -name "*\(7\)*" -delete
find . -type f -name "*\(8\)*" -delete
find . -type f -name "*\(9\)*" -delete
find . -type f -name "*\(10\)*" -delete
find . -type f -name "*\(11\)*" -delete
find . -type f -name "*\(12\)*" -delete
find . -type f -name "*\(13\)*" -delete
find . -type f -name "*\(14\)*" -delete
find . -type f -name "*\(15\)*" -delete
find . -type f -name "*\(16\)*" -delete
find . -type f -name "*\(17\)*" -delete
find . -type f -name "*\(18\)*" -delete
find . -type f -name "*\(19\)*" -delete
find . -type f -name "*\(20\)*" -delete
find . -type f -name "*\(21\)*" -delete
find . -type f -name "*\(22\)*" -delete
find . -type f -name "*\(23\)*" -delete
find . -type f -name "*\(24\)*" -delete
find . -type f -name "*\(25\)*" -delete

echo "✅ Duplicates removed"
