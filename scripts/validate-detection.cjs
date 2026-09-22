#!/usr/bin/env node

/**
 * Validation script for detector output
 * 
 * This script validates that a detector result matches the expected
 * output for the login page test case.
 * 
 * Usage:
 *   node scripts/validate-detection.cjs <detection-output.json>
 * 
 * The detection output JSON should be an array of DetectedObject:
 * [
 *   { type: 'text', x: ..., y: ..., width: ..., height: ..., ... },
 *   ...
 * ]
 */

const fs = require('fs');
const path = require('path');

// Expected detection rules for login page
const EXPECTED = {
  totalCount: 4,
  typeCounts: {
    // Input fields: 'text', 'password', or 'number' all count as INPUT
    INPUT: 2,
    button: 1,
    link: 1,
  },
  // Types that should NOT appear
  forbiddenTypes: ['select'],
};

const INPUT_TYPES = ['text', 'password', 'number'];

function validateDetection(detectedObjects) {
  const errors = [];
  const warnings = [];

  // Validate structure
  if (!Array.isArray(detectedObjects)) {
    errors.push('Detection output must be an array');
    return { valid: false, errors, warnings };
  }

  // Check total count
  if (detectedObjects.length !== EXPECTED.totalCount) {
    errors.push(
      `Expected ${EXPECTED.totalCount} objects, got ${detectedObjects.length}`
    );
  }

  // Count types
  const typeCounts = {
    INPUT: 0,
    button: 0,
    radio: 0,
    checkbox: 0,
    link: 0,
    other: 0,
  };

  detectedObjects.forEach((obj, idx) => {
    // Validate required fields
    if (!obj.type) {
      errors.push(`Object ${idx}: missing 'type' field`);
      return;
    }
    if (typeof obj.x !== 'number' || typeof obj.y !== 'number') {
      errors.push(`Object ${idx}: missing or invalid position (x, y)`);
    }
    if (typeof obj.width !== 'number' || typeof obj.height !== 'number') {
      errors.push(`Object ${idx}: missing or invalid size (width, height)`);
    }

    // Count by type category
    if (INPUT_TYPES.includes(obj.type)) {
      typeCounts.INPUT++;
    } else if (obj.type === 'button') {
      typeCounts.button++;
    } else if (obj.type === 'radio') {
      typeCounts.radio++;
    } else if (obj.type === 'checkbox') {
      typeCounts.checkbox++;
    } else if (obj.type === 'link') {
      typeCounts.link++;
    } else {
      typeCounts.other++;
      warnings.push(`Object ${idx}: unexpected type '${obj.type}'`);
    }

    // Check for forbidden types
    if (EXPECTED.forbiddenTypes.includes(obj.type)) {
      errors.push(
        `Object ${idx}: type '${obj.type}' should not be detected (select/dropdown not allowed)`
      );
    }
  });

  // Validate type counts
  Object.entries(EXPECTED.typeCounts).forEach(([type, expectedCount]) => {
    const actualCount = typeCounts[type];
    if (actualCount !== expectedCount) {
      errors.push(
        `Expected ${expectedCount}× ${type}, got ${actualCount}× ${type}`
      );
    }
  });

  // Check for unexpected types
  ['radio', 'checkbox'].forEach((type) => {
    if (typeCounts[type] > 0) {
      warnings.push(
        `Unexpected ${typeCounts[type]}× ${type} detected (login page should not have these)`
      );
    }
  });

  const valid = errors.length === 0;

  return { valid, errors, warnings, typeCounts };
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Detector Output Validator');
    console.log('=========================\n');
    console.log('Expected output for login page:');
    console.log(`  - Total objects: ${EXPECTED.totalCount}`);
    console.log(
      `  - ${EXPECTED.typeCounts.INPUT}× INPUT (text/password/number)`
    );
    console.log(`  - ${EXPECTED.typeCounts.button}× BUTTON`);
    console.log(`  - ${EXPECTED.typeCounts.link}× LINK`);
    console.log('\nUsage:');
    console.log('  node scripts/validate-detection.cjs <detection-output.json>');
    console.log('\nExample:');
    console.log(
      '  node scripts/validate-detection.cjs fixtures/login-detection-result.json'
    );
    process.exit(0);
  }

  const inputFile = args[0];

  if (!fs.existsSync(inputFile)) {
    console.error(`Error: File not found: ${inputFile}`);
    process.exit(1);
  }

  let detectedObjects;
  try {
    const content = fs.readFileSync(inputFile, 'utf8');
    detectedObjects = JSON.parse(content);
  } catch (err) {
    console.error(`Error reading/parsing file: ${err.message}`);
    process.exit(1);
  }

  console.log('Validating detection output...\n');

  const result = validateDetection(detectedObjects);

  console.log(`Objects detected: ${detectedObjects.length}`);
  console.log('\nType breakdown:');
  Object.entries(result.typeCounts).forEach(([type, count]) => {
    if (count > 0) {
      const expected = EXPECTED.typeCounts[type] || 0;
      const status = count === expected ? '✓' : '✗';
      console.log(`  ${status} ${type}: ${count} (expected: ${expected})`);
    }
  });

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach((warning) => console.log(`  - ${warning}`));
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Validation FAILED:');
    result.errors.forEach((error) => console.log(`  - ${error}`));
    process.exit(1);
  } else {
    console.log('\n✅ Validation PASSED');
    console.log('   All checks passed for login page detection.');
    process.exit(0);
  }
}

main();
