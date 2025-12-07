const fs = require('fs');
const path = require('path');

// Read the edit.ejs file
const filePath = path.join(__dirname, 'views/surgeries/edit.ejs');
const content = fs.readFileSync(filePath, 'utf8');

// Extract script content
const scriptMatch = content.match(/<script>([\s\S]*?)<\/script>/);

if (!scriptMatch) {
    console.error('❌ No script tag found');
    process.exit(1);
}

const scriptContent = scriptMatch[1];

// Count braces
const openBraces = (scriptContent.match(/\{/g) || []).length;
const closeBraces = (scriptContent.match(/\}/g) || []).length;

console.log(`Open braces: ${openBraces}`);
console.log(`Close braces: ${closeBraces}`);

if (openBraces !== closeBraces) {
    console.error(`❌ Braces not balanced! Difference: ${openBraces - closeBraces}`);
    process.exit(1);
}

// Check for required functions
const functions = [
    'initializeRoleSelect',
    'updateRolesForStaff',
    'addStaffRow',
    'removeStaffRow',
    'addConsumableMaterialRow',
    'removeConsumableMaterialRow',
    'addPatientMaterialRow',
    'removePatientMaterialRow',
    'updateDeleteButtonStates'
];

let allFound = true;
functions.forEach(fn => {
    if (scriptContent.includes(`function ${fn}`)) {
        console.log(`✓ Function ${fn} found`);
    } else {
        console.error(`✗ Function ${fn} NOT found`);
        allFound = false;
    }
});

// Check that functions are before DOMContentLoaded
const domContentLoadedPos = scriptContent.indexOf("document.addEventListener('DOMContentLoaded'");
const lastFunctionDefPos = Math.max(
    scriptContent.lastIndexOf('function initializeRoleSelect'),
    scriptContent.lastIndexOf('function updateRolesForStaff'),
    scriptContent.lastIndexOf('function updateDeleteButtonStates')
);

if (lastFunctionDefPos < domContentLoadedPos) {
    console.log('✓ All functions are defined before DOMContentLoaded');
} else {
    console.error('✗ Some functions are defined AFTER DOMContentLoaded');
    allFound = false;
}

if (allFound && openBraces === closeBraces) {
    console.log('\n✅ All checks passed! File is ready.');
    process.exit(0);
} else {
    console.log('\n❌ Some checks failed!');
    process.exit(1);
}
