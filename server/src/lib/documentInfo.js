import path from 'node:path';
import CFB from 'cfb';
import { unzipSync } from 'fflate';
import { detectFile, isImage } from './imageInfo.js';
import { ApiError } from '../middleware/error.js';

const MIME = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

// Inspect container contents, not just a ZIP/OLE signature. Never extract files to disk.
export function detectDocument(buffer, extension) {
  if (extension === 'docx') {
    let total = 0;
    let count = 0;
    const entries = unzipSync(buffer, { filter: (entry) => {
      total += entry.originalSize;
      if (++count > 2000 || total > 32 * 1024 * 1024 || /(?:^|\/)\.\.(?:\/|$)|\\|^\//.test(entry.name)) throw new Error('Unsafe document archive');
      if (/vbaProject|activeX|embeddings\//i.test(entry.name) || /\.(exe|dll|js|vbs|bat|cmd)$/i.test(entry.name)) throw new Error('Active document content is unsupported');
      return /^(?:\[Content_Types\]\.xml|word\/document\.xml)$/.test(entry.name);
    } });
    const types = Buffer.from(entries['[Content_Types].xml'] || []).toString('utf8');
    const xml = Buffer.from(entries['word/document.xml'] || []).toString('utf8');
    if (!types.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml') || !/<w:document[\s>]/.test(xml) || /<!DOCTYPE|<!ENTITY/i.test(types + xml)) return null;
  } else if (extension === 'doc') {
    if (buffer.length < 512 || buffer.subarray(0, 8).toString('hex') !== 'd0cf11e0a1b11ae1') return null;
    const container = CFB.read(buffer, { type: 'buffer' });
    const word = CFB.find(container, 'WordDocument');
    if (!word?.content || word.content.length < 32 || Buffer.from(word.content).readUInt16LE(0) !== 0xa5ec || !(CFB.find(container, '0Table') || CFB.find(container, '1Table'))) return null;
    if (container.FullPaths.some(name => /(?:VBA|Macros|ObjectPool|EncryptedPackage)/i.test(name))) throw new Error('Macros, embedded objects and encrypted documents are unsupported');
    // Encrypted and obfuscated Word binary files cannot be inspected safely.
    if (Buffer.from(word.content).readUInt16LE(10) & 0x8100) throw new Error('Encrypted documents are unsupported');
  } else return null;
  return { format: extension, mimeType: MIME[extension], width: null, height: null };
}

export function validateUpload(file) {
  const ext = path.extname(file.originalname).slice(1).toLowerCase();
  let info;
  try {
    info = ['doc', 'docx'].includes(ext) ? detectDocument(file.buffer, ext) : detectFile(file.buffer);
  } catch {
    throw new ApiError(400, `${file.originalname}: invalid or unsafe document contents`);
  }
  const normalized = ext === 'jpeg' ? 'jpg' : ext;
  if (!info || info.format !== normalized || !(isImage(info) || MIME[info.format])) throw new ApiError(400, `${file.originalname}: extension does not match a supported file's contents`);
  const mime = String(file.mimetype || '').toLowerCase();
  if (mime && mime !== 'application/octet-stream' && mime !== info.mimeType) throw new ApiError(400, `${file.originalname}: MIME type does not match file contents`);
  if (info.format === 'pdf') {
    const source = file.buffer.toString('latin1');
    if (!/%%EOF\s*$/.test(source) || !/\d+\s+\d+\s+obj\b/.test(source) || /\/(?:JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/i.test(source)) throw new ApiError(400, `${file.originalname}: invalid PDF or unsupported active content`);
  }
  return info;
}
