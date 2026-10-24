/**
 * Cloudinary logo upload helper.
 * Accepts Multer memoryStorage files (file.buffer); no local file or diskStorage
 * is required. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and
 * CLOUDINARY_API_SECRET in the deployment environment.
 */
const { v2: cloudinary } = require('cloudinary');

function configureCloudinary() {
  const cloud_name = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const api_key = String(process.env.CLOUDINARY_API_KEY || '').trim();
  const api_secret = String(process.env.CLOUDINARY_API_SECRET || '').trim();
  if (!cloud_name || !api_key || !api_secret) return false;
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return true;
}

function getMime(file) {
  const supplied = String(file?.mimetype || '').toLowerCase();
  if (/^image\/(png|jpeg|gif|webp|svg\+xml|avif|bmp|tiff)$/.test(supplied)) return supplied;
  const name = String(file?.originalname || '').toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.svg')) return 'image/svg+xml';
  if (name.endsWith('.avif')) return 'image/avif';
  if (name.endsWith('.bmp')) return 'image/bmp';
  if (name.endsWith('.tif') || name.endsWith('.tiff')) return 'image/tiff';
  throw new Error('Unsupported logo image type. Upload PNG, JPG, GIF, WEBP, SVG, AVIF, BMP or TIFF.');
}

function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      if (!result || !result.secure_url) return reject(new Error('Cloudinary upload returned no secure URL'));
      resolve(result);
    });
    stream.end(buffer);
  });
}

/** Upload a Multer memoryStorage file directly from its in-memory buffer. */
async function uploadLogoBuffer(file) {
  if (!configureCloudinary()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.');
  }
  if (!file) throw new Error('No file provided for logo upload');
  const buffer = file.buffer;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error(`Empty file (size=${file.size || 0}, name=${file.originalname || 'unknown'}). Select a valid image and try again.`);
  }
  const mime = getMime(file);
  const result = await uploadBuffer(buffer, {
    folder: 'trust-wallet-support/logos',
    resource_type: 'image',
    public_id: `logo-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    overwrite: false,
    format: mime === 'image/svg+xml' ? 'svg' : undefined,
    transformation: [{ width: 400, height: 400, crop: 'limit' }],
  });
  return result.secure_url;
}

/** Optional file resolver: no file/empty field returns an empty URL. */
async function resolveLogoUrl(file) {
  if (!file) return '';
  const size = file.size || (Buffer.isBuffer(file.buffer) ? file.buffer.length : 0);
  if (!size || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    console.warn('Logo field present but empty — skipping Cloudinary upload');
    return '';
  }
  return uploadLogoBuffer(file);
}

module.exports = { configureCloudinary, uploadLogoBuffer, resolveLogoUrl };
