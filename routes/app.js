import express from 'express';

const router = express.Router();

// POST /app/version-check
router.post('/version-check', (req, res) => {
  try {
    const { appVersion, buildNumber, platform, osVersion, deviceId } = req.body;

    // You can configure minimum versions per platform
    const MIN_VERSIONS = {
      ios: '0.0.1',
      android: '0.0.1',
    };

    const minVersion = MIN_VERSIONS[platform] || '0.0.1';
    
    // Simple version comparison (you might want to use a library like semver)
    const compareVersions = (v1, v2) => {
      const parts1 = v1.split('.').map(Number);
      const parts2 = v2.split('.').map(Number);
      
      for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        
        if (part1 < part2) return -1;
        if (part1 > part2) return 1;
      }
      
      return 0;
    };

    const isDeprecated = compareVersions(appVersion, minVersion) < 0;

    const updateUrls = {
      ios: process.env.IOS_UPDATE_URL || 'https://apps.apple.com/app/id123456789',
      android: process.env.ANDROID_UPDATE_URL || 'https://play.google.com/store/apps/details?id=com.auth0samples',
    };

    res.json({
      deprecated: isDeprecated,
      minVersion: minVersion,
      updateUrl: updateUrls[platform],
      message: isDeprecated 
        ? 'Please update to the latest version to continue using the app.'
        : undefined,
    });
  } catch (error) {
    console.error('Error checking app version:', error);
    // On error, don't block the app - return not deprecated
    res.json({ deprecated: false });
  }
});

export default router;

