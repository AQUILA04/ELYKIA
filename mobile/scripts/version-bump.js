const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const environmentPath = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
const environmentProdPath = path.join(__dirname, '..', 'src', 'environments', 'environment.prod.ts');

fs.readFile(packageJsonPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading package.json:', err);
    return;
  }

  const packageJson = JSON.parse(data);
  const currentVersion = packageJson.version;
  console.log(`Current version: ${currentVersion}`);

  // Remove any non-numeric suffix like ".M"
  let version = currentVersion.split('.M')[0];

  let [major, minor, patch] = version.split('.').map(Number);

  // Increment the patch version
  patch++;

  const newVersion = `${major}.${minor}.${patch}`;
  console.log(`New version: ${newVersion}`);

  packageJson.version = newVersion;

  fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8', (err) => {
    if (err) {
      console.error('Error writing package.json:', err);
    } else {
      console.log('Version bumped successfully in package.json!');
      updateEnvironmentFiles(newVersion);
    }
  });
});

function updateEnvironmentFiles(newVersion) {
  const filesToUpdate = [environmentPath, environmentProdPath];

  filesToUpdate.forEach(filePath => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(`Error reading ${filePath}:`, err);
        return;
      }

      let updatedContent;
      // Check if 'version' property already exists
      if (data.includes('version:')) {
        updatedContent = data.replace(/(version:\s*['"]).*?(['"])/, `$1${newVersion}$2`);
      } else {
        // Add 'version' property if it doesn't exist
        updatedContent = data.replace(/(export const environment = {[^}]*)/, `$1\n  version: '${newVersion}',`);
      }

      fs.writeFile(filePath, updatedContent, 'utf8', (err) => {
        if (err) {
          console.error(`Error writing ${filePath}:`, err);
        } else {
          console.log(`Version updated successfully in ${filePath}!`);
        }
      });
    });
  });
}