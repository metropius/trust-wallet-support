/**
 * Cloudinary logo upload helper (server-side)
 * Uses CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 */
const { v2: cloudinary } = require('cloudinary');

function configureCloudinary() {
  const cloud_name = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const api_key = String(process.env.CLOUDINARY_API_KEY || '').trim();
  const api_secret = String(process.env.CLOUDINARY_API_SECRET || '').trim();

  if (!cloud_name || !api_key || !api_secret) {
    return false;
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });
  return true;
}

function getMime(file) {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    return file.mimetype;
  }
  const name = (file.originalname || '').toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.svg')) return 'image/svg+xml';
  return 'image/png';
}

/**
 * Upload multer memory file to Cloudinary.
 * Uses data-URI upload (reliable with memory buffers).
 * Returns secure_url string.
 */
async function uploadLogoBuffer(file) {
  if (!configureCloudinary()) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env'
    );
  }

  if (!file) {
    throw new Error('No file provided for logo upload');
  }

  const buffer = file.buffer;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error(
      `Empty file (size=${file.size || 0}, name=${file.originalname || 'unknown'}). Select a valid image and try again.`
    );
  }

  const mime = getMime(file);
  const b64 = buffer.toString('base64');
  const dataUri = `data:${mime};base64,${b64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'trust-wallet-support/logos',
    resource_type: 'image',
    public_id: `logo-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    overwrite: false,
    transformation: [{ width: 400, height: 400, crop: 'limit' }],
  });

  if (!result || !result.secure_url) {
    throw new Error('Cloudinary upload returned no URL');
  }

  return result.secure_url;
}

/**
 * Resolve logo URL from multer file.
 * Returns '' if no file / empty file (does not throw for missing logo).
 * Throws only on real Cloudinary/config failures when a non-empty file was provided.
 */
async function resolveLogoUrl(file) {
  if (!file) return '';

  const size = file.size || (file.buffer && file.buffer.length) || 0;
  if (!size || !file.buffer || file.buffer.length === 0) {
    console.warn('Logo field present but empty — skipping Cloudinary upload');
    return '';
  }

  return uploadLogoBuffer(file);
}

module.exports = {
  configureCloudinary,
  uploadLogoBuffer,
  resolveLogoUrl,
};
