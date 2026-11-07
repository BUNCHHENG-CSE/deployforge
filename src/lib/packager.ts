import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';

const req = createRequire(import.meta.url);
const { ZipArchive } = req('archiver');

export interface IntuneWinMetadata {
  tool_version: string;
  setup_file_name: string;
  unencrypted_size: number;
  encrypted_size: number;
  file_digest: string;
  encryption_info: {
    encryptionKey: string;
    macKey: string;
    initializationVector: string;
    mac: string;
    profileIdentifier: string;
    fileDigest: string;
    fileDigestAlgorithm: string;
  };
  manifest_base64: string;
}

export class IntuneWinPackager {
  static readonly TOOL_VERSION = '1.8.5.0';

  /**
   * Packages an installer file (.exe, .msi, etc.) into an authentic Microsoft .intunewin package.
   */
  static async packageFile(
    inputFilePath: string,
    outputIntunewinPath: string,
    setupFileName?: string
  ): Promise<IntuneWinMetadata> {
    if (!fs.existsSync(inputFilePath)) {
      throw new Error(`Input file not found: ${inputFilePath}`);
    }

    const setupName = setupFileName || path.basename(inputFilePath);
    const plaintextData = fs.readFileSync(inputFilePath);
    const unencryptedSize = plaintextData.length;

    // 1. Calculate SHA-256 of plaintext
    const fileDigest = crypto.createHash('sha256').update(plaintextData).digest();
    const fileDigestB64 = fileDigest.toString('base64');

    // 2. Generate random cryptographic keys
    const encryptionKey = crypto.randomBytes(32); // AES-256 key (32 bytes)
    const macKey = crypto.randomBytes(32);        // HMAC-SHA256 key (32 bytes)
    const iv = crypto.randomBytes(16);            // AES IV (16 bytes)

    // 3. Encrypt data using AES-256-CBC (Node crypto uses PKCS7 padding by default)
    const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
    const encryptedData = Buffer.concat([cipher.update(plaintextData), cipher.final()]);
    const encryptedSize = encryptedData.length;

    // 4. Compute HMAC-SHA256 of ciphertext
    const hmac = crypto.createHmac('sha256', macKey).update(encryptedData).digest();
    const macB64 = hmac.toString('base64');

    // 5. Base64 encode keys for XML and Graph API
    const encryptionKeyB64 = encryptionKey.toString('base64');
    const macKeyB64 = macKey.toString('base64');
    const ivB64 = iv.toString('base64');

    // 6. Build Detection.xml
    const detectionXml =
      `<?xml version="1.0" encoding="utf-8"?>\n` +
      `<ApplicationInfo xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ToolVersion="${this.TOOL_VERSION}">\n` +
      `  <Name>${setupName}</Name>\n` +
      `  <UnencryptedContentSize>${unencryptedSize}</UnencryptedContentSize>\n` +
      `  <FileName>${setupName}</FileName>\n` +
      `  <SetupFile>${setupName}</SetupFile>\n` +
      `  <EncryptionInfo>\n` +
      `    <EncryptionKey>${encryptionKeyB64}</EncryptionKey>\n` +
      `    <MacKey>${macKeyB64}</MacKey>\n` +
      `    <InitializationVector>${ivB64}</InitializationVector>\n` +
      `    <Mac>${macB64}</Mac>\n` +
      `    <ProfileIdentifier>ProfileVersion1</ProfileIdentifier>\n` +
      `    <FileDigest>${fileDigestB64}</FileDigest>\n` +
      `    <FileDigestAlgorithm>SHA256</FileDigestAlgorithm>\n` +
      `  </EncryptionInfo>\n` +
      `</ApplicationInfo>`;

    const manifestB64 = Buffer.from(detectionXml, 'utf-8').toString('base64');

    // 7. Create .intunewin zip archive
    const outputDir = path.dirname(path.resolve(outputIntunewinPath));
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    await new Promise<void>((resolve, reject) => {
      const outputStream = fs.createWriteStream(outputIntunewinPath);
      const archive = new ZipArchive({ zlib: { level: 6 } });

      outputStream.on('close', () => resolve());
      archive.on('error', (err: any) => reject(err));

      archive.pipe(outputStream);

      // Add Detection.xml
      archive.append(Buffer.from(detectionXml, 'utf-8'), {
        name: 'IntuneWinPackage/Metadata/Detection.xml',
      });

      // Add encrypted payload as <setup_file_name>.intunewin
      archive.append(encryptedData, {
        name: `IntuneWinPackage/Contents/${setupName}.intunewin`,
      });

      archive.finalize();
    });

    return {
      tool_version: this.TOOL_VERSION,
      setup_file_name: setupName,
      unencrypted_size: unencryptedSize,
      encrypted_size: encryptedSize,
      file_digest: fileDigestB64,
      encryption_info: {
        encryptionKey: encryptionKeyB64,
        macKey: macKeyB64,
        initializationVector: ivB64,
        mac: macB64,
        profileIdentifier: 'ProfileVersion1',
        fileDigest: fileDigestB64,
        fileDigestAlgorithm: 'SHA256',
      },
      manifest_base64: manifestB64,
    };
  }
}
